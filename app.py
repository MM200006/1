#!/usr/bin/env python3
"""
Flask web application for the German Real Estate Agent Scraper.

Provides a web dashboard to:
- View all scraped businesses
- Start new scraping jobs
- Monitor job progress
- View business details and 1-star reviews
- Export results as CSV
"""

import csv
import io
import json
import logging
import os
import sqlite3
import threading
import time
from datetime import datetime

from flask import (Flask, Response, flash, jsonify, redirect, render_template,
                   request, url_for)

from src.config import GOOGLE_API_KEY, OPENAI_API_KEY

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key-change-in-production")

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "scraper.db")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── Global job state ──
_job_lock = threading.Lock()
_current_job = {
    "running": False,
    "id": None,
    "progress": 0,
    "total": 0,
    "status": "idle",
    "step": "",
    "log": [],
}


# ─────────────────────────────────────────────
# Database helpers
# ─────────────────────────────────────────────

def _get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = _get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS businesses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            place_id TEXT UNIQUE,
            company_name TEXT NOT NULL,
            address TEXT DEFAULT '',
            phone_maps TEXT DEFAULT '',
            website TEXT DEFAULT '',
            rating REAL DEFAULT 0,
            reviews_count INTEGER DEFAULT 0,
            one_star_reviews TEXT DEFAULT '[]',
            ai_analysis TEXT DEFAULT '',
            ceo_name TEXT DEFAULT '',
            phone_impressum TEXT DEFAULT '',
            email_impressum TEXT DEFAULT '',
            impressum_url TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT NOT NULL,
            cities TEXT NOT NULL,
            max_per_city INTEGER DEFAULT 20,
            status TEXT DEFAULT 'pending',
            total_found INTEGER DEFAULT 0,
            total_processed INTEGER DEFAULT 0,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            finished_at TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()


def _upsert_business(conn, biz: dict):
    """Insert or update a business record."""
    reviews_json = json.dumps(biz.get("one_star_reviews", []), ensure_ascii=False)
    conn.execute("""
        INSERT INTO businesses (
            place_id, company_name, address, phone_maps, website,
            rating, reviews_count, one_star_reviews, ai_analysis,
            ceo_name, phone_impressum, email_impressum, impressum_url,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(place_id) DO UPDATE SET
            company_name=excluded.company_name,
            address=excluded.address,
            phone_maps=excluded.phone_maps,
            website=excluded.website,
            rating=excluded.rating,
            reviews_count=excluded.reviews_count,
            one_star_reviews=excluded.one_star_reviews,
            ai_analysis=excluded.ai_analysis,
            ceo_name=excluded.ceo_name,
            phone_impressum=excluded.phone_impressum,
            email_impressum=excluded.email_impressum,
            impressum_url=excluded.impressum_url,
            updated_at=CURRENT_TIMESTAMP
    """, (
        biz.get("place_id", ""),
        biz.get("company_name", ""),
        biz.get("address", ""),
        biz.get("phone_maps", ""),
        biz.get("website", ""),
        biz.get("rating", 0),
        biz.get("reviews_count", 0),
        reviews_json,
        biz.get("ai_analysis", ""),
        biz.get("ceo_name", ""),
        biz.get("phone_impressum", ""),
        biz.get("email_impressum", ""),
        biz.get("impressum_url", ""),
    ))
    conn.commit()


# ─────────────────────────────────────────────
# Background scraping job
# ─────────────────────────────────────────────

def _job_log(msg: str):
    with _job_lock:
        _current_job["log"].append(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
        # Keep last 200 lines
        if len(_current_job["log"]) > 200:
            _current_job["log"] = _current_job["log"][-200:]
    logger.info(msg)


def _run_scrape_job(job_id: int, query: str, cities: list[str], max_per_city: int):
    """Run the full scraping pipeline in a background thread."""
    from src.ai_analyzer import analyze_company
    from src.maps_scraper import filter_businesses_with_one_star, search_realtors
    from src.website_scraper import scrape_website

    global _current_job

    conn = _get_db()

    try:
        # Step 1: Google Maps search
        with _job_lock:
            _current_job["step"] = "Google Maps suchen..."
        _job_log(f"Suche '{query}' in {len(cities)} Städten...")

        all_businesses = search_realtors(query=query, cities=cities,
                                          max_results_per_city=max_per_city)
        _job_log(f"{len(all_businesses)} Unternehmen gefunden.")

        # Step 2: Filter for 1-star reviews
        with _job_lock:
            _current_job["step"] = "1-Stern-Bewertungen filtern..."
        _job_log("Filtere nach 1-Stern-Bewertungen...")

        filtered = filter_businesses_with_one_star(all_businesses)
        _job_log(f"{len(filtered)} Unternehmen mit 1-Stern-Bewertungen.")

        with _job_lock:
            _current_job["total"] = len(filtered)

        conn.execute("UPDATE jobs SET total_found=? WHERE id=?",
                     (len(filtered), job_id))
        conn.commit()

        # Step 3 & 4: Website scraping + AI analysis
        with _job_lock:
            _current_job["step"] = "Websites analysieren..."

        for i, biz in enumerate(filtered):
            name = biz["company_name"]
            with _job_lock:
                _current_job["progress"] = i + 1
                _current_job["step"] = f"Verarbeite: {name}"

            _job_log(f"[{i+1}/{len(filtered)}] {name}")

            website_url = biz.get("website", "")
            if website_url:
                site_data = scrape_website(website_url)
                biz["ai_analysis"] = analyze_company(
                    website_text=site_data["main_page_text"],
                    company_name=name,
                )
                biz["ceo_name"] = site_data["ceo_name"]
                biz["phone_impressum"] = site_data["phone_impressum"]
                biz["email_impressum"] = site_data["email_impressum"]
                biz["impressum_url"] = site_data["impressum_url"]
            else:
                biz["ai_analysis"] = "[Keine Website vorhanden]"

            _upsert_business(conn, biz)

            conn.execute("UPDATE jobs SET total_processed=? WHERE id=?",
                         (i + 1, job_id))
            conn.commit()

        # Done
        conn.execute("UPDATE jobs SET status='completed', finished_at=CURRENT_TIMESTAMP WHERE id=?",
                     (job_id,))
        conn.commit()
        _job_log("Job abgeschlossen!")

    except Exception as e:
        _job_log(f"FEHLER: {e}")
        logger.exception("Job %d failed", job_id)
        conn.execute("UPDATE jobs SET status='failed', finished_at=CURRENT_TIMESTAMP WHERE id=?",
                     (job_id,))
        conn.commit()

    finally:
        conn.close()
        with _job_lock:
            _current_job["running"] = False
            _current_job["status"] = "idle"
            _current_job["step"] = ""


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.route("/")
def dashboard():
    conn = _get_db()
    total = conn.execute("SELECT COUNT(*) FROM businesses").fetchone()[0]
    with_reviews = conn.execute(
        "SELECT COUNT(*) FROM businesses WHERE one_star_reviews != '[]'"
    ).fetchone()[0]
    with_website = conn.execute(
        "SELECT COUNT(*) FROM businesses WHERE website != ''"
    ).fetchone()[0]
    avg_rating = conn.execute(
        "SELECT AVG(rating) FROM businesses WHERE rating > 0"
    ).fetchone()[0] or 0

    recent = conn.execute(
        "SELECT * FROM businesses ORDER BY updated_at DESC LIMIT 10"
    ).fetchall()

    jobs = conn.execute(
        "SELECT * FROM jobs ORDER BY started_at DESC LIMIT 5"
    ).fetchall()

    conn.close()

    stats = {
        "total": total,
        "with_reviews": with_reviews,
        "with_website": with_website,
        "avg_rating": round(avg_rating, 1),
    }

    return render_template("dashboard.html", stats=stats, recent=recent,
                           jobs=jobs, current_job=_current_job)


@app.route("/results")
def results():
    conn = _get_db()

    # Filtering
    search = request.args.get("search", "").strip()
    sort_by = request.args.get("sort", "updated_at")
    order = request.args.get("order", "desc")

    allowed_sorts = {"company_name", "rating", "reviews_count", "updated_at", "created_at"}
    if sort_by not in allowed_sorts:
        sort_by = "updated_at"
    if order not in ("asc", "desc"):
        order = "desc"

    if search:
        rows = conn.execute(
            f"SELECT * FROM businesses WHERE company_name LIKE ? OR address LIKE ? "
            f"ORDER BY {sort_by} {order}",
            (f"%{search}%", f"%{search}%")
        ).fetchall()
    else:
        rows = conn.execute(
            f"SELECT * FROM businesses ORDER BY {sort_by} {order}"
        ).fetchall()

    conn.close()

    return render_template("results.html", businesses=rows, search=search,
                           sort_by=sort_by, order=order)


@app.route("/business/<int:business_id>")
def business_detail(business_id):
    conn = _get_db()
    biz = conn.execute("SELECT * FROM businesses WHERE id=?", (business_id,)).fetchone()
    conn.close()

    if not biz:
        flash("Unternehmen nicht gefunden.", "error")
        return redirect(url_for("results"))

    reviews = json.loads(biz["one_star_reviews"]) if biz["one_star_reviews"] else []

    return render_template("detail.html", biz=biz, reviews=reviews)


@app.route("/scrape", methods=["GET", "POST"])
def scrape():
    if request.method == "POST":
        with _job_lock:
            if _current_job["running"]:
                flash("Ein Scraping-Job läuft bereits. Bitte warten.", "warning")
                return redirect(url_for("scrape"))

        query = request.form.get("query", "Immobilienmakler").strip()
        cities_str = request.form.get("cities", "").strip()
        max_per_city = int(request.form.get("max_per_city", 20))

        if cities_str:
            cities = [c.strip() for c in cities_str.split(",") if c.strip()]
        else:
            cities = None  # Use defaults

        # Create job record
        conn = _get_db()
        cities_display = ", ".join(cities) if cities else "Top 20 Städte"
        cursor = conn.execute(
            "INSERT INTO jobs (query, cities, max_per_city, status) VALUES (?, ?, ?, 'running')",
            (query, cities_display, max_per_city)
        )
        job_id = cursor.lastrowid
        conn.commit()
        conn.close()

        # Start background job
        with _job_lock:
            _current_job.update({
                "running": True,
                "id": job_id,
                "progress": 0,
                "total": 0,
                "status": "running",
                "step": "Wird gestartet...",
                "log": [],
            })

        thread = threading.Thread(
            target=_run_scrape_job,
            args=(job_id, query, cities, max_per_city),
            daemon=True,
        )
        thread.start()

        flash(f"Scraping-Job #{job_id} gestartet!", "success")
        return redirect(url_for("scrape"))

    return render_template("scrape.html", current_job=_current_job,
                           has_google_key=bool(GOOGLE_API_KEY),
                           has_openai_key=bool(OPENAI_API_KEY))


@app.route("/api/job-status")
def job_status():
    with _job_lock:
        return jsonify({
            "running": _current_job["running"],
            "progress": _current_job["progress"],
            "total": _current_job["total"],
            "status": _current_job["status"],
            "step": _current_job["step"],
            "log": _current_job["log"][-30:],
        })


@app.route("/export/csv")
def export_csv():
    conn = _get_db()
    rows = conn.execute("SELECT * FROM businesses ORDER BY company_name").fetchall()
    conn.close()

    if not rows:
        flash("Keine Daten zum Exportieren.", "warning")
        return redirect(url_for("results"))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Company Name", "Phone (Google Maps)", "Website URL",
        "Google Maps Rating", "Total Reviews", "1-Star Review Text",
        "AI Company Analysis", "CEO / Geschäftsführer",
        "Phone (Impressum)", "Email (Impressum)", "Impressum URL",
    ])

    for row in rows:
        reviews = json.loads(row["one_star_reviews"]) if row["one_star_reviews"] else []
        review_text = " | ".join(reviews)
        writer.writerow([
            row["company_name"], row["phone_maps"], row["website"],
            row["rating"], row["reviews_count"], review_text,
            row["ai_analysis"], row["ceo_name"],
            row["phone_impressum"], row["email_impressum"], row["impressum_url"],
        ])

    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = (
        f"attachment; filename=immobilienmakler_{datetime.now().strftime('%Y%m%d')}.csv"
    )
    return response


@app.route("/delete/<int:business_id>", methods=["POST"])
def delete_business(business_id):
    conn = _get_db()
    conn.execute("DELETE FROM businesses WHERE id=?", (business_id,))
    conn.commit()
    conn.close()
    flash("Eintrag gelöscht.", "success")
    return redirect(url_for("results"))


# ─────────────────────────────────────────────
# Init & Run
# ─────────────────────────────────────────────

init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
