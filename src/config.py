import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GOOGLE_SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "credentials/service_account.json")
GOOGLE_SPREADSHEET_ID = os.getenv("GOOGLE_SPREADSHEET_ID", "")

# Default search parameters
DEFAULT_SEARCH_QUERY = "Immobilienmakler"  # "real estate agent" in German
DEFAULT_LOCATION = "Germany"

# Request settings
REQUEST_TIMEOUT = 30
REQUEST_DELAY_MIN = 2  # seconds between website requests (be polite)
REQUEST_DELAY_MAX = 5

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

# Google Sheets column headers
SHEET_HEADERS = [
    "Company Name",
    "Phone (Google Maps)",
    "Website URL",
    "Google Maps Rating",
    "Total Reviews",
    "1-Star Review Text",
    "AI Company Analysis",
    "CEO / Geschäftsführer",
    "Phone (Impressum)",
    "Email (Impressum)",
    "Impressum URL",
]
