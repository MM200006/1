#!/usr/bin/env python3
"""
German Real Estate Agent Scraper & Analyzer

Pipeline:
1. Search Google Maps for real estate agents (Immobilienmakler) in German cities
2. Filter for those with at least one 1-star Google review
3. Scrape each company website for main content
4. AI-analyze what the company does and specializes in
5. Scrape the Impressum page for CEO name, phone, email
6. Export everything to Google Sheets (or CSV as fallback)

Usage:
    python main.py [options]

See README.md for full setup instructions.
"""

import argparse
import json
import logging
import os
import sys

from src.maps_scraper import search_realtors, filter_businesses_with_one_star
from src.website_scraper import scrape_website
from src.ai_analyzer import analyze_company
from src.sheets_exporter import export_to_sheets, export_to_csv

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("scraper.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)


def run_pipeline(
    query: str = "Immobilienmakler",
    cities: list[str] | None = None,
    max_per_city: int = 20,
    export_mode: str = "sheets",
    spreadsheet_id: str = "",
    csv_path: str = "output/results.csv",
    checkpoint_path: str = "output/checkpoint.json",
) -> list[dict]:
    """
    Run the full scraping and analysis pipeline.

    Args:
        query: Google Maps search query.
        cities: Cities to search in (None = default major cities).
        max_per_city: Maximum results per city from Google Maps.
        export_mode: "sheets", "csv", or "both".
        spreadsheet_id: Google Spreadsheet ID (for sheets export).
        csv_path: Output CSV path (for csv export).
        checkpoint_path: Path to save intermediate results for resume.

    Returns:
        The final list of enriched business data dicts.
    """
    # ── Step 0: Check for existing checkpoint to resume from ──
    enriched_data = []
    processed_names = set()
    maps_data = []

    if os.path.exists(checkpoint_path):
        logger.info("Found checkpoint at %s, loading...", checkpoint_path)
        with open(checkpoint_path, "r", encoding="utf-8") as f:
            checkpoint = json.load(f)
        enriched_data = checkpoint.get("enriched", [])
        maps_data = checkpoint.get("maps_data", [])
        processed_names = {e["company_name"] for e in enriched_data}
        logger.info("Resuming with %d already processed, %d in maps queue.",
                     len(enriched_data), len(maps_data))

    # ── Step 1: Search Google Maps ──
    if not maps_data:
        logger.info("=" * 60)
        logger.info("STEP 1: Searching Google Maps for '%s'...", query)
        logger.info("=" * 60)

        all_businesses = search_realtors(
            query=query, cities=cities, max_results_per_city=max_per_city
        )
        logger.info("Found %d unique businesses from Google Maps.", len(all_businesses))

        # ── Step 2: Filter for 1-star reviews ──
        logger.info("=" * 60)
        logger.info("STEP 2: Filtering for businesses with 1-star reviews...")
        logger.info("=" * 60)

        maps_data = filter_businesses_with_one_star(all_businesses)
        logger.info("Kept %d businesses with 1-star reviews.", len(maps_data))

        _save_checkpoint(checkpoint_path, enriched_data, maps_data)

    # ── Step 3 & 4: Scrape websites + AI analysis + Impressum ──
    logger.info("=" * 60)
    logger.info("STEP 3-4: Scraping websites and running AI analysis...")
    logger.info("=" * 60)

    for i, biz in enumerate(maps_data):
        name = biz["company_name"]
        if name in processed_names:
            continue

        logger.info("[%d/%d] Processing: %s", i + 1, len(maps_data), name)

        website_url = biz.get("website", "")
        if not website_url:
            logger.warning("  No website URL for %s, skipping website scrape.", name)
            biz["ai_analysis"] = "[No website available]"
            biz["ceo_name"] = ""
            biz["phone_impressum"] = ""
            biz["email_impressum"] = ""
            biz["impressum_url"] = ""
            enriched_data.append(biz)
            processed_names.add(name)
            _save_checkpoint(checkpoint_path, enriched_data, maps_data)
            continue

        # Scrape website
        site_data = scrape_website(website_url)

        # AI analysis
        ai_analysis = analyze_company(
            website_text=site_data["main_page_text"],
            company_name=name,
        )

        # Merge data
        biz["ai_analysis"] = ai_analysis
        biz["ceo_name"] = site_data["ceo_name"]
        biz["phone_impressum"] = site_data["phone_impressum"]
        biz["email_impressum"] = site_data["email_impressum"]
        biz["impressum_url"] = site_data["impressum_url"]

        enriched_data.append(biz)
        processed_names.add(name)

        # Save checkpoint after each business
        _save_checkpoint(checkpoint_path, enriched_data, maps_data)
        logger.info("  Done. Impressum: %s | CEO: %s | Email: %s",
                     site_data["impressum_url"] or "N/A",
                     site_data["ceo_name"] or "N/A",
                     site_data["email_impressum"] or "N/A")

    # ── Step 5: Export ──
    logger.info("=" * 60)
    logger.info("STEP 5: Exporting %d results...", len(enriched_data))
    logger.info("=" * 60)

    if export_mode in ("sheets", "both"):
        try:
            url = export_to_sheets(enriched_data, spreadsheet_id=spreadsheet_id)
            logger.info("Google Sheets export complete: %s", url)
        except Exception:
            logger.exception("Google Sheets export failed. Falling back to CSV.")
            csv_out = export_to_csv(enriched_data, csv_path)
            logger.info("CSV fallback export: %s", csv_out)

    if export_mode in ("csv", "both"):
        csv_out = export_to_csv(enriched_data, csv_path)
        logger.info("CSV export: %s", csv_out)

    # Clean up checkpoint on success
    if os.path.exists(checkpoint_path):
        os.remove(checkpoint_path)
        logger.info("Removed checkpoint file (pipeline complete).")

    logger.info("Pipeline complete. Processed %d businesses.", len(enriched_data))
    return enriched_data


def _save_checkpoint(path: str, enriched: list[dict], maps_data: list[dict]):
    """Save intermediate results so the pipeline can resume after interruption."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"enriched": enriched, "maps_data": maps_data}, f,
                  ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser(
        description="Scrape German real estate agents from Google Maps, "
                    "analyze their websites, and export to Google Sheets."
    )
    parser.add_argument(
        "-q", "--query",
        default="Immobilienmakler",
        help="Search query for Google Maps (default: 'Immobilienmakler')."
    )
    parser.add_argument(
        "-c", "--cities",
        nargs="+",
        default=None,
        help="Cities to search in (default: top 20 German cities). "
             "Example: -c Berlin Hamburg München"
    )
    parser.add_argument(
        "--max-per-city",
        type=int,
        default=20,
        help="Max results per city (default: 20)."
    )
    parser.add_argument(
        "--export",
        choices=["sheets", "csv", "both"],
        default="both",
        help="Export mode: 'sheets', 'csv', or 'both' (default: 'both')."
    )
    parser.add_argument(
        "--spreadsheet-id",
        default="",
        help="Override Google Spreadsheet ID from .env."
    )
    parser.add_argument(
        "--csv-path",
        default="output/results.csv",
        help="CSV output path (default: output/results.csv)."
    )
    parser.add_argument(
        "--checkpoint",
        default="output/checkpoint.json",
        help="Checkpoint file for resuming (default: output/checkpoint.json)."
    )

    args = parser.parse_args()

    results = run_pipeline(
        query=args.query,
        cities=args.cities,
        max_per_city=args.max_per_city,
        export_mode=args.export,
        spreadsheet_id=args.spreadsheet_id,
        csv_path=args.csv_path,
        checkpoint_path=args.checkpoint,
    )

    print(f"\nDone! Processed {len(results)} real estate agents.")


if __name__ == "__main__":
    main()
