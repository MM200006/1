# German Real Estate Agent Scraper & Analyzer

Automated pipeline that discovers German real estate agents (Immobilienmakler) via Google Maps, filters for those with 1-star reviews, scrapes their websites for business details, uses ChatGPT to analyze their specialization, and exports everything to Google Sheets.

## What It Collects

For each real estate agent:

| Field | Source |
|---|---|
| Company Name | Google Maps |
| Phone (Google Maps) | Google Maps |
| Website URL | Google Maps |
| Google Maps Rating | Google Maps |
| Total Reviews | Google Maps |
| 1-Star Review Text | Google Maps Reviews |
| AI Company Analysis | Website → ChatGPT |
| CEO / Geschäftsführer | Website Impressum |
| Phone (Impressum) | Website Impressum |
| Email (Impressum) | Website Impressum |
| Impressum URL | Website Impressum |

## Prerequisites

- Python 3.11+
- API keys (see below)

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure API keys

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

Then edit `.env` and add your keys.

#### Google API Key (for Places API / Maps search)

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an API key (or use an existing one)
3. Enable the **Places API** in your project ([Enable here](https://console.cloud.google.com/apis/library/places-backend.googleapis.com))
4. Add to `.env` as `GOOGLE_API_KEY`

> **Note:** The Places API has a free $200/month credit. Text Search costs $32 per 1000 requests, Place Details $17 per 1000 requests.

#### OpenAI API Key (for ChatGPT analysis)

1. Get an API key at https://platform.openai.com/api-keys
2. Add to `.env` as `OPENAI_API_KEY`

> Uses `gpt-4o-mini` by default (very affordable: ~$0.15 per 1M input tokens).

#### Google Sheets (for spreadsheet export)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use an existing one)
3. Enable the **Google Sheets API** and **Google Drive API**
4. Create a **Service Account** under IAM & Admin → Service Accounts
5. Generate a JSON key for the service account
6. Save the JSON file to `credentials/service_account.json`
7. Create a Google Spreadsheet and **share it with the service account email** (found in the JSON file, looks like `name@project.iam.gserviceaccount.com`)
8. Copy the spreadsheet ID from its URL and add to `.env` as `GOOGLE_SPREADSHEET_ID`

## Usage

### Full pipeline (Google Sheets + CSV)

```bash
python main.py
```

### Search specific cities

```bash
python main.py -c Berlin München Hamburg
```

### CSV-only export (no Google Sheets needed)

```bash
python main.py --export csv
```

### Custom search query

```bash
python main.py -q "Hausverwaltung"
```

### All options

```
python main.py --help
```

| Flag | Default | Description |
|---|---|---|
| `-q, --query` | `Immobilienmakler` | Google Maps search query |
| `-c, --cities` | Top 20 German cities | Space-separated city list |
| `--max-per-city` | `20` | Max results per city |
| `--export` | `both` | `sheets`, `csv`, or `both` |
| `--spreadsheet-id` | from `.env` | Override spreadsheet ID |
| `--csv-path` | `output/results.csv` | CSV output path |
| `--checkpoint` | `output/checkpoint.json` | Checkpoint file path |

## Resume After Interruption

The pipeline saves a checkpoint after processing each business. If the script is interrupted, simply re-run the same command and it will resume from where it left off.

To start fresh, delete the checkpoint file:

```bash
rm output/checkpoint.json
```

## Project Structure

```
├── main.py                  # CLI entry point & pipeline orchestrator
├── src/
│   ├── config.py            # Configuration & environment variables
│   ├── maps_scraper.py      # Google Places API search & review fetching
│   ├── website_scraper.py   # Website & Impressum scraping
│   ├── ai_analyzer.py       # ChatGPT company analysis
│   └── sheets_exporter.py   # Google Sheets & CSV export
├── requirements.txt
├── .env.example
└── credentials/             # Google service account JSON (gitignored)
```

## API Costs

- **Google Places API**: Text Search = $32/1K requests, Place Details = $17/1K requests. Google gives a free $200/month credit.
- **OpenAI**: gpt-4o-mini at ~$0.15/1M input tokens + $0.60/1M output tokens. Very low cost per company.
- **Google Sheets API**: Free within standard quotas.

## Rate Limiting

- 2-5 second polite delays between website requests
- 2 second delays between Google API calls
- Pagination pauses for Google next_page_token
