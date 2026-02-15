"""
Google Maps scraper using the Google Places API directly.

Searches for real estate agents in German cities, collects business info,
and fetches 1-star reviews for each result.
"""

import logging
import time

import requests

from src.config import GOOGLE_API_KEY, REQUEST_DELAY_MIN, REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

PLACES_TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACES_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

# Major German cities to search across
GERMAN_CITIES = [
    "Berlin", "Hamburg", "München", "Köln", "Frankfurt am Main",
    "Stuttgart", "Düsseldorf", "Leipzig", "Dortmund", "Essen",
    "Bremen", "Dresden", "Hannover", "Nürnberg", "Duisburg",
    "Bochum", "Wuppertal", "Bielefeld", "Bonn", "Münster",
]


def search_realtors(query: str = "Immobilienmakler", cities: list[str] | None = None,
                    max_results_per_city: int = 20) -> list[dict]:
    """
    Search Google Maps for real estate agents in German cities.

    Uses Google Places Text Search API, then fetches details (phone, website,
    reviews) for each result via Place Details API.

    Args:
        query: Search term (default: "Immobilienmakler").
        cities: List of cities to search in. Defaults to major German cities.
        max_results_per_city: Max results to collect per city.

    Returns:
        List of dicts with business info from Google Maps.
    """
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY is not set. Add it to your .env file.")

    cities = cities or GERMAN_CITIES
    all_results = []
    seen_place_ids = set()

    for city in cities:
        logger.info("Searching for '%s' in %s...", query, city)
        search_query = f"{query} in {city}, Deutschland"

        try:
            places = _text_search(search_query, max_results_per_city)
        except Exception:
            logger.exception("Error searching in %s", city)
            continue

        city_count = 0
        for place in places:
            place_id = place.get("place_id", "")
            if not place_id or place_id in seen_place_ids:
                continue
            seen_place_ids.add(place_id)

            business = _extract_basic_info(place)
            if business:
                all_results.append(business)
                city_count += 1

        logger.info("Found %d new results in %s (total unique: %d)",
                     city_count, city, len(all_results))
        time.sleep(REQUEST_DELAY_MIN)

    return all_results


def _text_search(query: str, max_results: int) -> list[dict]:
    """
    Run a Google Places Text Search.
    Handles pagination via next_page_token (up to 60 results max from Google).
    """
    all_places = []

    params = {
        "query": query,
        "language": "de",
        "region": "de",
        "key": GOOGLE_API_KEY,
    }

    while len(all_places) < max_results:
        resp = requests.get(PLACES_TEXT_SEARCH_URL, params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        status = data.get("status")
        if status != "OK":
            if status == "ZERO_RESULTS":
                break
            logger.warning("Places Text Search status: %s — %s",
                           status, data.get("error_message", ""))
            break

        results = data.get("results", [])
        all_places.extend(results)

        # Google returns next_page_token for more results (max 3 pages of 20)
        next_token = data.get("next_page_token")
        if not next_token or len(all_places) >= max_results:
            break

        # Google requires a short delay before using next_page_token
        time.sleep(2)
        params = {
            "pagetoken": next_token,
            "key": GOOGLE_API_KEY,
        }

    return all_places[:max_results]


def _extract_basic_info(place: dict) -> dict | None:
    """Extract basic info from a Text Search result."""
    name = place.get("name", "").strip()
    if not name:
        return None

    return {
        "company_name": name,
        "place_id": place.get("place_id", ""),
        "address": place.get("formatted_address", ""),
        "rating": place.get("rating", 0),
        "reviews_count": place.get("user_ratings_total", 0),
        # phone and website come from Place Details
        "phone_maps": "",
        "website": "",
    }


def enrich_with_details(business: dict) -> dict:
    """
    Fetch Place Details (phone, website, reviews) for a single business.
    Merges the data into the business dict in-place and returns it.
    """
    place_id = business.get("place_id", "")
    if not place_id:
        return business

    params = {
        "place_id": place_id,
        "fields": "formatted_phone_number,international_phone_number,website,reviews",
        "language": "de",
        "key": GOOGLE_API_KEY,
    }

    try:
        resp = requests.get(PLACES_DETAILS_URL, params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        if data.get("status") != "OK":
            logger.warning("Place Details error for %s: %s",
                           business["company_name"], data.get("status"))
            return business

        result = data.get("result", {})

        business["phone_maps"] = (
            result.get("international_phone_number")
            or result.get("formatted_phone_number", "")
        )
        business["website"] = result.get("website", "")

        # Extract 1-star reviews
        reviews = result.get("reviews", [])
        one_star = []
        for review in reviews:
            if review.get("rating") == 1:
                text = review.get("text", "").strip()
                if text:
                    one_star.append(text)

        business["one_star_reviews"] = one_star

    except Exception:
        logger.exception("Failed to fetch details for %s", business["company_name"])

    return business


def filter_businesses_with_one_star(businesses: list[dict]) -> list[dict]:
    """
    Fetch details for each business and keep only those with at least
    one 1-star review.

    This calls the Place Details API for each business (which counts as
    one API call per business).
    """
    filtered = []

    for i, biz in enumerate(businesses):
        logger.info("[%d/%d] Fetching details for: %s",
                     i + 1, len(businesses), biz["company_name"])

        enrich_with_details(biz)
        reviews = biz.get("one_star_reviews", [])

        if reviews:
            filtered.append(biz)
            logger.info("  -> Found %d one-star review(s), keeping.", len(reviews))
        else:
            logger.info("  -> No 1-star reviews found, skipping.")

        time.sleep(REQUEST_DELAY_MIN)

    logger.info("Filtered to %d businesses with 1-star reviews (from %d total)",
                len(filtered), len(businesses))
    return filtered
