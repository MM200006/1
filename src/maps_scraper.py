"""
Google Maps scraper using SerpAPI.

Searches for real estate agents in German cities, collects business info,
and fetches 1-star reviews for each result.
"""

import logging
import time
from serpapi import GoogleSearch
from src.config import SERPAPI_KEY, REQUEST_DELAY_MIN

logger = logging.getLogger(__name__)

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

    Args:
        query: Search term (default: "Immobilienmakler" = real estate agent).
        cities: List of cities to search in. Defaults to major German cities.
        max_results_per_city: Max results to collect per city.

    Returns:
        List of dicts with business info from Google Maps.
    """
    if not SERPAPI_KEY:
        raise ValueError("SERPAPI_KEY is not set. Add it to your .env file.")

    cities = cities or GERMAN_CITIES
    all_results = []
    seen_place_ids = set()

    for city in cities:
        logger.info("Searching for '%s' in %s...", query, city)
        search_query = f"{query} in {city}"

        try:
            results = _search_google_maps(search_query, max_results_per_city)
        except Exception:
            logger.exception("Error searching in %s", city)
            continue

        for place in results:
            place_id = place.get("place_id", place.get("title", ""))
            if place_id in seen_place_ids:
                continue
            seen_place_ids.add(place_id)

            business = _extract_business_info(place)
            if business:
                all_results.append(business)

        logger.info("Found %d results in %s (total unique: %d)",
                     len(results), city, len(all_results))
        time.sleep(REQUEST_DELAY_MIN)

    return all_results


def _search_google_maps(query: str, max_results: int) -> list[dict]:
    """Run a single Google Maps search via SerpAPI."""
    params = {
        "engine": "google_maps",
        "q": query,
        "hl": "de",
        "gl": "de",
        "type": "search",
        "api_key": SERPAPI_KEY,
    }

    search = GoogleSearch(params)
    results = search.get_dict()

    local_results = results.get("local_results", [])
    return local_results[:max_results]


def _extract_business_info(place: dict) -> dict | None:
    """Extract relevant business info from a Google Maps result."""
    title = place.get("title", "").strip()
    if not title:
        return None

    return {
        "company_name": title,
        "phone_maps": place.get("phone", ""),
        "website": place.get("website", ""),
        "address": place.get("address", ""),
        "rating": place.get("rating", 0),
        "reviews_count": place.get("reviews", 0),
        "place_id": place.get("place_id", ""),
        "data_id": place.get("data_id", ""),
        "gps_coordinates": place.get("gps_coordinates", {}),
    }


def fetch_one_star_reviews(place_id: str, data_id: str = "") -> list[str]:
    """
    Fetch 1-star reviews for a specific business.

    Args:
        place_id: Google Maps place_id.
        data_id: Google Maps data_id (used by SerpAPI for review lookup).

    Returns:
        List of 1-star review text strings.
    """
    if not SERPAPI_KEY:
        return []

    if not data_id:
        logger.warning("No data_id for place %s, skipping review fetch.", place_id)
        return []

    try:
        params = {
            "engine": "google_maps_reviews",
            "data_id": data_id,
            "hl": "de",
            "sort_by": "lowest_rating",
            "api_key": SERPAPI_KEY,
        }

        search = GoogleSearch(params)
        results = search.get_dict()

        reviews = results.get("reviews", [])
        one_star = []
        for review in reviews:
            if review.get("rating", 5) == 1:
                snippet = review.get("snippet", review.get("text", ""))
                if snippet:
                    one_star.append(snippet)

        return one_star

    except Exception:
        logger.exception("Error fetching reviews for place %s", place_id)
        return []


def filter_businesses_with_one_star(businesses: list[dict]) -> list[dict]:
    """
    Filter businesses and fetch their 1-star reviews.
    Only keeps businesses that have at least one 1-star review.
    """
    filtered = []

    for biz in businesses:
        place_id = biz.get("place_id", "")
        data_id = biz.get("data_id", "")

        logger.info("Fetching reviews for: %s", biz["company_name"])
        reviews = fetch_one_star_reviews(place_id, data_id)

        if reviews:
            biz["one_star_reviews"] = reviews
            filtered.append(biz)
            logger.info("  -> Found %d one-star review(s)", len(reviews))
        else:
            logger.info("  -> No 1-star reviews, skipping.")

        time.sleep(REQUEST_DELAY_MIN)

    logger.info("Filtered to %d businesses with 1-star reviews (from %d total)",
                len(filtered), len(businesses))
    return filtered
