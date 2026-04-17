#!/usr/bin/env python3
"""
Generiert eine Excel-Kontaktliste für Telefonakquise.
Enthält Agenturen, Berater, Experten und Coaches aus dem DACH-Raum.
"""

import re
import time
import requests
from bs4 import BeautifulSoup
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter


def create_contact_list():
    wb = Workbook()
    ws = wb.active
    ws.title = "Kontaktliste Akquise"

    headers = [
        "Nr.",
        "Kategorie",
        "Firmenname",
        "Website URL",
        "Impressum URL",
        "Telefonnummer",
        "E-Mail",
        "CEO / Geschäftsführer",
        "Branche / Spezialisierung",
        "Status",
        "Notizen",
        "Kontaktiert am",
    ]

    header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    cell_font = Font(name="Calibri", size=10)
    thin_border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )

    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border

    ws.row_dimensions[1].height = 30

    column_widths = {
        1: 6,    # Nr.
        2: 18,   # Kategorie
        3: 35,   # Firmenname
        4: 40,   # Website URL
        5: 45,   # Impressum URL
        6: 22,   # Telefonnummer
        7: 35,   # E-Mail
        8: 30,   # CEO
        9: 30,   # Branche
        10: 15,  # Status
        11: 30,  # Notizen
        12: 16,  # Kontaktiert am
    }

    for col, width in column_widths.items():
        ws.column_dimensions[get_column_letter(col)].width = width

    ws.auto_filter.ref = f"A1:L1"
    ws.freeze_panes = "A2"

    # --- Kategorien für die Suche ---
    categories = {
        "Marketing Agentur": [
            ("Jung von Matt", "https://www.jungvonmatt.de"),
            ("Serviceplan Group", "https://www.serviceplan.com"),
            ("BBDO Germany", "https://www.bbdo.de"),
            ("Scholz & Friends", "https://www.s-f.com"),
            ("Publicis Groupe Germany", "https://www.publicisgroupe.com"),
            ("Grey Germany", "https://www.grey.de"),
            ("Grabarz & Partner", "https://www.grabarzundpartner.de"),
            ("DDB Germany", "https://www.ddb.de"),
            ("Havas Germany", "https://www.havas.com"),
            ("Ogilvy Germany", "https://www.ogilvy.com"),
        ],
        "Digital Agentur": [
            ("SinnerSchrader", "https://www.sinnerschrader.com"),
            ("Aperto", "https://www.aperto.com"),
            ("Sapient Razorfish", "https://www.publicissapient.com"),
            ("denkwerk", "https://www.denkwerk.com"),
            ("Valtech Germany", "https://www.valtech.com"),
            ("Merkle DACH", "https://www.merkle.com"),
            ("Hmmh", "https://www.hmmh.de"),
            ("Namics / Merkle", "https://www.merkle.com"),
            ("Netzkern", "https://www.netzkern.de"),
            ("Arithnea", "https://www.arithnea.de"),
        ],
        "Unternehmensberatung": [
            ("Simon-Kucher & Partners", "https://www.simon-kucher.com"),
            ("Porsche Consulting", "https://www.porsche-consulting.com"),
            ("Horváth & Partners", "https://www.horvath-partners.com"),
            ("Stern Stewart & Co.", "https://www.sternstewart.com"),
            ("Staufen AG", "https://www.staufen.ag"),
            ("Kienbaum Consultants", "https://www.kienbaum.com"),
            ("zeb", "https://www.zeb.de"),
            ("Lünendonk", "https://www.luenendonk.de"),
            ("FTI-Andersch", "https://www.fti-andersch.com"),
            ("Wieselhuber & Partner", "https://www.wieselhuber.de"),
        ],
        "SEO/SEA Agentur": [
            ("Sistrix", "https://www.sistrix.de"),
            ("Searchmetrics", "https://www.searchmetrics.com"),
            ("Bloofusion", "https://www.bloofusion.de"),
            ("SEO-Küche", "https://www.seo-kueche.de"),
            ("Performics", "https://www.performics.de"),
            ("Dept Agency", "https://www.deptagency.com"),
            ("Claneo", "https://www.claneo.com"),
            ("mso digital", "https://www.mso-digital.de"),
            ("Aufgesang", "https://www.aufgesang.de"),
            ("rankeffect", "https://www.rankeffect.de"),
        ],
        "Business Coach": [
            ("Greator (ehem. GEDANKENtanken)", "https://www.greator.com"),
            ("Business Mastery (Dirk Kreuter)", "https://www.dirkkreuter.com"),
            ("Maximal Digital (Calvin Hollywood)", "https://www.calvinhollywood.de"),
            ("Andreas Buhr & Team", "https://www.andreasbuhr.com"),
            ("Jürgen Höller Academy", "https://www.hoeller.com"),
            ("Hermann Scherer", "https://www.hermannscherer.com"),
            ("Tobias Beck", "https://www.tobias-beck.com"),
            ("Laura Seiler Life Coaching", "https://www.lauraseiler.com"),
            ("Christian Bischoff", "https://www.christianbischoff.com"),
            ("Bodo Schäfer Akademie", "https://www.bodoschaefer.de"),
        ],
        "PR Agentur": [
            ("Edelman Germany", "https://www.edelman.de"),
            ("FleishmanHillard Germany", "https://www.fleishmanhillard.de"),
            ("Burson Germany", "https://www.bursonglobal.com"),
            ("Ketchum Germany", "https://www.ketchum.de"),
            ("Weber Shandwick Germany", "https://www.webershandwick.de"),
            ("Lautenbach Sass", "https://www.lautenbachsass.de"),
            ("Fink & Fuchs", "https://www.finkfuchs.de"),
            ("Faktenkontor", "https://www.faktenkontor.de"),
            ("Piabo PR", "https://www.piabo.net"),
            ("Frau Wenk +++ PR", "https://www.frauwenk.de"),
        ],
        "Social Media Agentur": [
            ("adsventure", "https://www.adsventure.de"),
            ("Social Match", "https://www.socialmatch.de"),
            ("Torben Platzer / TPA Media", "https://www.tpa-media.com"),
            ("Projecter", "https://www.projecter.de"),
            ("Facelift (Socialbakers)", "https://www.facelift-bbt.com"),
            ("Buzzbird", "https://www.buzzbird.de"),
            ("Reachbird", "https://www.reachbird.io"),
            ("Hi Share That", "https://www.hisharethat.com"),
            ("Agorapulse Partner DE", "https://www.agorapulse.com"),
            ("Social DNA", "https://www.socialdna.de"),
        ],
        "IT Beratung / Experten": [
            ("MHP (Porsche Tochter)", "https://www.mhp.com"),
            ("msg systems", "https://www.msg.group"),
            ("adesso SE", "https://www.adesso.de"),
            ("Senacor Technologies", "https://www.senacor.com"),
            ("Exxeta", "https://www.exxeta.com"),
            ("Allgeier SE", "https://www.allgeier.com"),
            ("CONET Group", "https://www.conet.de"),
            ("iteratec", "https://www.iteratec.com"),
            ("Cassini Consulting", "https://www.cassini.de"),
            ("Sopra Steria", "https://www.soprasteria.de"),
        ],
    }

    row_idx = 2
    for category, companies in categories.items():
        for name, url in companies:
            impressum_url = url.rstrip("/") + "/impressum"
            ws.cell(row=row_idx, column=1, value=row_idx - 1).font = cell_font
            ws.cell(row=row_idx, column=2, value=category).font = cell_font
            ws.cell(row=row_idx, column=3, value=name).font = cell_font
            ws.cell(row=row_idx, column=4, value=url).font = Font(name="Calibri", size=10, color="0563C1", underline="single")
            ws.cell(row=row_idx, column=4).hyperlink = url
            ws.cell(row=row_idx, column=5, value=impressum_url).font = Font(name="Calibri", size=10, color="0563C1", underline="single")
            ws.cell(row=row_idx, column=6, value="").font = cell_font
            ws.cell(row=row_idx, column=7, value="").font = cell_font
            ws.cell(row=row_idx, column=8, value="").font = cell_font
            ws.cell(row=row_idx, column=9, value=category).font = cell_font
            ws.cell(row=row_idx, column=10, value="Offen").font = cell_font
            ws.cell(row=row_idx, column=11, value="").font = cell_font
            ws.cell(row=row_idx, column=12, value="").font = cell_font

            for col in range(1, 13):
                ws.cell(row=row_idx, column=col).border = thin_border
                ws.cell(row=row_idx, column=col).alignment = Alignment(vertical="center", wrap_text=True)

            row_idx += 1

    # --- Status-Farbkodierung Info-Sheet ---
    ws_info = wb.create_sheet("Anleitung")
    ws_info.column_dimensions["A"].width = 20
    ws_info.column_dimensions["B"].width = 60

    info_data = [
        ("Status-Werte:", ""),
        ("Offen", "Noch nicht kontaktiert"),
        ("Angerufen", "Telefonat geführt, kein Ergebnis"),
        ("Interesse", "Interesse bekundet, Follow-up nötig"),
        ("Termin", "Termin vereinbart"),
        ("Kein Interesse", "Kein Interesse, nicht weiter verfolgen"),
        ("Nicht erreicht", "Nicht erreicht, erneut versuchen"),
        ("", ""),
        ("Daten ergänzen:", ""),
        ("1.", "Impressum-URL aufrufen → Telefon, E-Mail, Geschäftsführer ablesen"),
        ("2.", "Fehlende Daten über LinkedIn oder Handelsregister recherchieren"),
        ("3.", "Das Skript scrape_impressum.py kann dabei helfen, Impressum-Daten automatisch auszulesen"),
    ]

    for idx, (col_a, col_b) in enumerate(info_data, 1):
        ws_info.cell(row=idx, column=1, value=col_a).font = Font(name="Calibri", size=10, bold=(idx in [1, 9]))
        ws_info.cell(row=idx, column=2, value=col_b).font = Font(name="Calibri", size=10)

    output_path = "/home/user/1/kontaktliste_akquise.xlsx"
    wb.save(output_path)
    print(f"Excel-Datei erstellt: {output_path}")
    print(f"Anzahl Einträge: {row_idx - 2}")
    return output_path


if __name__ == "__main__":
    create_contact_list()
