"""
AI-powered company analysis using OpenAI ChatGPT.

Takes scraped website text and produces a concise analysis of what the
real estate company does and what it specializes in.
"""

import logging
from openai import OpenAI
from src.config import OPENAI_API_KEY

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
Du bist ein Business-Analyst, der deutsche Immobilienunternehmen analysiert. \
Antworte immer auf Deutsch, kurz und prägnant (maximal 3-4 Sätze)."""

ANALYSIS_PROMPT = """\
Analysiere den folgenden Website-Text eines deutschen Immobilienunternehmens \
und erstelle eine kurze Zusammenfassung (maximal 3-4 Sätze).

Beantworte dabei:
1. Was macht das Unternehmen genau? (z.B. Vermietung, Verkauf, Hausverwaltung, \
Projektentwicklung, Gewerbeimmobilien, Wohnimmobilien)
2. Auf welche Bereiche / Regionen ist es spezialisiert?
3. Was sind besondere Merkmale oder Alleinstellungsmerkmale?

Antworte NUR mit der Zusammenfassung, ohne Einleitung oder Überschriften.

--- WEBSITE TEXT ---
{website_text}
---"""


def analyze_company(website_text: str, company_name: str = "") -> str:
    """
    Use ChatGPT to analyze what a real estate company does and specializes in.

    Args:
        website_text: The scraped text content from the company website.
        company_name: Optional company name for context.

    Returns:
        A concise AI-generated analysis string.
    """
    if not OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set. Skipping AI analysis.")
        return "[AI analysis skipped - no API key]"

    if not website_text or len(website_text.strip()) < 50:
        return "[Insufficient website content for analysis]"

    # Truncate very long texts to keep costs down
    max_chars = 8000
    if len(website_text) > max_chars:
        website_text = website_text[:max_chars] + "\n[...truncated...]"

    prompt = ANALYSIS_PROMPT.format(website_text=website_text)

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=500,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )

        analysis = response.choices[0].message.content.strip()
        logger.info("AI analysis for '%s': %s", company_name, analysis[:80])
        return analysis

    except Exception:
        logger.exception("OpenAI API error during analysis for '%s'", company_name)
        return "[AI analysis failed - API error]"
