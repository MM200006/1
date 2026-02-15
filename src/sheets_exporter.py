"""
Google Sheets exporter using gspread.

Writes the collected real estate agent data into a Google Spreadsheet.
"""

import logging
import gspread
from google.oauth2.service_account import Credentials

from src.config import GOOGLE_SERVICE_ACCOUNT_FILE, GOOGLE_SPREADSHEET_ID, SHEET_HEADERS

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


def get_gspread_client() -> gspread.Client:
    """Authenticate and return a gspread client using service account credentials."""
    creds = Credentials.from_service_account_file(
        GOOGLE_SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    return gspread.authorize(creds)


def export_to_sheets(data: list[dict], spreadsheet_id: str = "",
                     worksheet_name: str = "Immobilienmakler") -> str:
    """
    Export collected data to a Google Spreadsheet.

    Args:
        data: List of dicts, each representing one real estate agent.
        spreadsheet_id: The Google Spreadsheet ID. Defaults to config value.
        worksheet_name: Name of the worksheet/tab to write to.

    Returns:
        URL of the spreadsheet.
    """
    spreadsheet_id = spreadsheet_id or GOOGLE_SPREADSHEET_ID
    if not spreadsheet_id:
        raise ValueError(
            "GOOGLE_SPREADSHEET_ID is not set. Add it to your .env file."
        )

    client = get_gspread_client()

    try:
        spreadsheet = client.open_by_key(spreadsheet_id)
    except gspread.SpreadsheetNotFound:
        raise ValueError(
            f"Spreadsheet {spreadsheet_id} not found. "
            "Make sure the service account has access to the spreadsheet."
        )

    # Get or create the worksheet
    try:
        worksheet = spreadsheet.worksheet(worksheet_name)
        logger.info("Using existing worksheet: %s", worksheet_name)
    except gspread.WorksheetNotFound:
        worksheet = spreadsheet.add_worksheet(
            title=worksheet_name, rows=str(len(data) + 10), cols=str(len(SHEET_HEADERS))
        )
        logger.info("Created new worksheet: %s", worksheet_name)

    # Write headers
    worksheet.update(range_name="A1", values=[SHEET_HEADERS])

    # Format header row as bold
    worksheet.format("A1:K1", {"textFormat": {"bold": True}})

    # Prepare rows
    rows = []
    for entry in data:
        one_star_texts = entry.get("one_star_reviews", [])
        review_text = " | ".join(one_star_texts) if one_star_texts else ""
        # Truncate very long review text for the cell
        if len(review_text) > 2000:
            review_text = review_text[:2000] + "..."

        row = [
            entry.get("company_name", ""),
            entry.get("phone_maps", ""),
            entry.get("website", ""),
            str(entry.get("rating", "")),
            str(entry.get("reviews_count", "")),
            review_text,
            entry.get("ai_analysis", ""),
            entry.get("ceo_name", ""),
            entry.get("phone_impressum", ""),
            entry.get("email_impressum", ""),
            entry.get("impressum_url", ""),
        ]
        rows.append(row)

    if rows:
        start_row = 2
        end_row = start_row + len(rows) - 1
        end_col = chr(ord("A") + len(SHEET_HEADERS) - 1)
        range_name = f"A{start_row}:{end_col}{end_row}"

        worksheet.update(range_name=range_name, values=rows)
        logger.info("Wrote %d rows to Google Sheets.", len(rows))

    spreadsheet_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit"
    logger.info("Spreadsheet URL: %s", spreadsheet_url)
    return spreadsheet_url


def export_to_csv(data: list[dict], output_path: str = "output/results.csv") -> str:
    """
    Export data to a local CSV file as a fallback / offline option.

    Args:
        data: List of dicts with business data.
        output_path: Path to write the CSV file.

    Returns:
        The output path.
    """
    import csv
    import os

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(SHEET_HEADERS)

        for entry in data:
            one_star_texts = entry.get("one_star_reviews", [])
            review_text = " | ".join(one_star_texts) if one_star_texts else ""

            row = [
                entry.get("company_name", ""),
                entry.get("phone_maps", ""),
                entry.get("website", ""),
                str(entry.get("rating", "")),
                str(entry.get("reviews_count", "")),
                review_text,
                entry.get("ai_analysis", ""),
                entry.get("ceo_name", ""),
                entry.get("phone_impressum", ""),
                entry.get("email_impressum", ""),
                entry.get("impressum_url", ""),
            ]
            writer.writerow(row)

    logger.info("Wrote %d rows to CSV: %s", len(data), output_path)
    return output_path
