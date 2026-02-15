"""
Website scraper for company websites.

Scrapes the main page for company description and finds the Impressum
(imprint) page to extract CEO name, phone, and email.
"""

import logging
import re
import time
import random
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from src.config import REQUEST_TIMEOUT, REQUEST_DELAY_MIN, REQUEST_DELAY_MAX, USER_AGENT

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.5",
}

# Common Impressum link patterns on German websites
IMPRESSUM_PATTERNS = [
    re.compile(r"impressum", re.IGNORECASE),
    re.compile(r"imprint", re.IGNORECASE),
    re.compile(r"legal\s*notice", re.IGNORECASE),
    re.compile(r"rechtliche.*hinweise", re.IGNORECASE),
]

# Patterns for extracting Geschäftsführer / CEO
CEO_PATTERNS = [
    re.compile(
        r"(?:Geschäftsführ(?:er|ung|erin)|Inhaber(?:in)?|"
        r"Managing\s*Director|CEO|Vorstand|Geschäftsleitung)"
        r"[:\s]*([A-ZÄÖÜa-zäöüß\.\-]+\s+[A-ZÄÖÜa-zäöüß\.\-]+(?:\s+[A-ZÄÖÜa-zäöüß\.\-]+)?)",
        re.IGNORECASE,
    ),
    # Pattern: "Name Surname, Geschäftsführer"
    re.compile(
        r"([A-ZÄÖÜ][a-zäöüß\.\-]+\s+[A-ZÄÖÜ][a-zäöüß\.\-]+)"
        r"(?:\s*,\s*|\s+)"
        r"(?:Geschäftsführ(?:er|erin)|Inhaber(?:in)?|Managing\s*Director|CEO)",
        re.IGNORECASE,
    ),
]

# Email pattern
EMAIL_PATTERN = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
)

# Phone patterns common in Germany
PHONE_PATTERNS = [
    # +49 xxx xxx or 0049 xxx xxx
    re.compile(r"(?:\+49|0049)[\s\-/()]*\d[\d\s\-/()]{6,15}"),
    # 0xxx / xxx xxx or 0xxx-xxxxxxx
    re.compile(r"0\d{2,5}[\s\-/]+\d[\d\s\-/]{4,12}"),
]


def scrape_website(url: str) -> dict:
    """
    Scrape a company website: main page text + Impressum data.

    Args:
        url: The website URL.

    Returns:
        Dict with keys: main_page_text, impressum_url, ceo_name,
        phone_impressum, email_impressum.
    """
    result = {
        "main_page_text": "",
        "impressum_url": "",
        "ceo_name": "",
        "phone_impressum": "",
        "email_impressum": "",
    }

    if not url:
        return result

    # Normalize URL
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    # 1) Scrape main page
    main_soup = _fetch_page(url)
    if not main_soup:
        return result

    result["main_page_text"] = _extract_visible_text(main_soup)

    # 2) Find and scrape Impressum
    impressum_url = _find_impressum_link(main_soup, url)
    if impressum_url:
        result["impressum_url"] = impressum_url
        _polite_delay()

        impressum_soup = _fetch_page(impressum_url)
        if impressum_soup:
            impressum_text = _extract_visible_text(impressum_soup)
            result["ceo_name"] = _extract_ceo(impressum_text)
            result["phone_impressum"] = _extract_phone(impressum_text)
            result["email_impressum"] = _extract_email(impressum_soup, impressum_text)

    return result


def _fetch_page(url: str) -> BeautifulSoup | None:
    """Fetch a page and return parsed BeautifulSoup, or None on error."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT,
                                allow_redirects=True)
        response.raise_for_status()

        content_type = response.headers.get("Content-Type", "")
        if "text/html" not in content_type and "application/xhtml" not in content_type:
            logger.warning("Non-HTML content at %s: %s", url, content_type)
            return None

        return BeautifulSoup(response.text, "lxml")

    except requests.RequestException:
        logger.exception("Failed to fetch %s", url)
        return None


def _extract_visible_text(soup: BeautifulSoup) -> str:
    """Extract visible text content from a page, stripping scripts/styles."""
    for tag in soup(["script", "style", "noscript", "svg", "path", "meta", "link"]):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)

    # Collapse multiple blank lines
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)


def _find_impressum_link(soup: BeautifulSoup, base_url: str) -> str:
    """Find the Impressum/Imprint link on a page."""
    for link in soup.find_all("a", href=True):
        href = link.get("href", "")
        link_text = link.get_text(strip=True)

        # Check link text
        for pattern in IMPRESSUM_PATTERNS:
            if pattern.search(link_text):
                return urljoin(base_url, href)

        # Check href
        for pattern in IMPRESSUM_PATTERNS:
            if pattern.search(href):
                return urljoin(base_url, href)

    # Fallback: try common Impressum URL paths
    parsed = urlparse(base_url)
    base = f"{parsed.scheme}://{parsed.netloc}"

    common_paths = ["/impressum", "/impressum/", "/imprint", "/legal-notice",
                    "/impressum.html", "/de/impressum"]
    for path in common_paths:
        try:
            test_url = base + path
            resp = requests.head(test_url, headers=HEADERS, timeout=10,
                                 allow_redirects=True)
            if resp.status_code == 200:
                return test_url
        except requests.RequestException:
            continue

    return ""


def _extract_ceo(text: str) -> str:
    """Extract CEO / Geschäftsführer name from Impressum text."""
    for pattern in CEO_PATTERNS:
        match = pattern.search(text)
        if match:
            name = match.group(1).strip()
            # Basic validation: should have at least two words
            if len(name.split()) >= 2:
                return name
    return ""


def _extract_phone(text: str) -> str:
    """Extract the first phone number from Impressum text."""
    for pattern in PHONE_PATTERNS:
        match = pattern.search(text)
        if match:
            phone = match.group(0).strip()
            # Clean up formatting
            phone = re.sub(r"[\s]+", " ", phone)
            return phone
    return ""


def _extract_email(soup: BeautifulSoup, text: str) -> str:
    """
    Extract business email from the Impressum page.
    Checks both mailto: links and visible text.
    """
    # First check mailto: links (most reliable)
    for link in soup.find_all("a", href=True):
        href = link.get("href", "")
        if href.startswith("mailto:"):
            email = href.replace("mailto:", "").split("?")[0].strip()
            if EMAIL_PATTERN.match(email):
                return email

    # Fall back to regex on visible text
    match = EMAIL_PATTERN.search(text)
    if match:
        email = match.group(0)
        # Filter out common non-business emails
        ignore = ["example.com", "domain.com", "email.com", "wixpress.com"]
        if not any(domain in email for domain in ignore):
            return email

    return ""


def _polite_delay():
    """Wait a random polite interval between requests."""
    delay = random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX)
    time.sleep(delay)
