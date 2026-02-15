"""
AI-powered company analysis using Anthropic Claude API.

Takes scraped website text and produces a concise analysis of what the
real estate company does and what it specializes in.
"""

import logging
import anthropic
from src.config import ANTHROPIC_API_KEY

logger = logging.getLogger(__name__)

ANALYSIS_PROMPT = """\
Du bist ein Business-Analyst. Analysiere den folgenden Website-Text eines \
deutschen Immobilienunternehmens und erstelle eine kurze Zusammenfassung \
(maximal 3-4 Sätze) auf Deutsch.

Beantworte dabei folgende Fragen:
1. Was macht das Unternehmen genau? (z.B. Vermietung, Verkauf, Hausverwaltung, \
Projektentwicklung, Gewerbeimmobilien, Wohnimmobilien)
2. Auf welche Bereiche / Regionen ist es spezialisiert?
3. Was sind besondere Merkmale oder Alleinstellungsmerkmale?

Antworte NUR mit der Zusammenfassung, ohne Einleitung oder Überschriften.

--- WEBSITE TEXT ---
{website_text}
---
"""


def analyze_company(website_text: str, company_name: str = "") -> str:
    """
    Use Claude to analyze what a real estate company does and specializes in.

    Args:
        website_text: The scraped text content from the company website.
        company_name: Optional company name for context.

    Returns:
        A concise AI-generated analysis string.
    """
    if not ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set. Skipping AI analysis.")
        return "[AI analysis skipped - no API key]"

    if not website_text or len(website_text.strip()) < 50:
        return "[Insufficient website content for analysis]"

    # Truncate very long texts to keep costs down
    max_chars = 8000
    if len(website_text) > max_chars:
        website_text = website_text[:max_chars] + "\n[...truncated...]"

    prompt = ANALYSIS_PROMPT.format(website_text=website_text)

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[
                {"role": "user", "content": prompt},
            ],
        )

        analysis = message.content[0].text.strip()
        logger.info("AI analysis for '%s': %s", company_name, analysis[:80])
        return analysis

    except anthropic.APIError:
        logger.exception("Anthropic API error during analysis for '%s'", company_name)
        return "[AI analysis failed - API error]"
    except Exception:
        logger.exception("Unexpected error during AI analysis for '%s'", company_name)
        return "[AI analysis failed]"
