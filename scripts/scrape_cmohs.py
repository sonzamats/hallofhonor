#!/usr/bin/env python3
"""
Medal of Honor recipient scraper.

Scrapes recipient data from https://www.cmohs.org/recipients, paginates
through all list pages, and enriches records with birth-location data
from the Wikipedia API.

Output: data/medal_of_honor_recipients.json
"""

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.cmohs.org/recipients"
WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "medal_of_honor_recipients.json"

HEADERS = {
    "User-Agent": (
        "HallOfValor-Research-Bot/1.0 "
        "(educational project; contact@example.com)"
    ),
    "Accept": "text/html,application/xhtml+xml",
}

MAX_RETRIES = 3
RETRY_BACKOFF = 2  # seconds, doubled each retry
RATE_LIMIT_DELAY = 1  # seconds between requests

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Network helpers
# ---------------------------------------------------------------------------

def _get(url: str, params: dict | None = None, session: requests.Session | None = None) -> requests.Response:
    """GET with retries, back-off, and rate-limit delay."""
    requester = session or requests
    last_exc = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requester.get(url, headers=HEADERS, params=params, timeout=30)
            resp.raise_for_status()
            time.sleep(RATE_LIMIT_DELAY)
            return resp
        except requests.RequestException as exc:
            last_exc = exc
            wait = RETRY_BACKOFF * attempt
            logger.warning("Attempt %d/%d failed for %s: %s — retrying in %ds",
                           attempt, MAX_RETRIES, url, exc, wait)
            time.sleep(wait)
    raise RuntimeError(f"Failed after {MAX_RETRIES} attempts: {last_exc}") from last_exc


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

def discover_pages(session: requests.Session) -> list[str]:
    """Return a list of recipient-list page URLs (page 1 … N)."""
    logger.info("Discovering pagination from %s", BASE_URL)
    resp = _get(BASE_URL, session=session)
    soup = BeautifulSoup(resp.text, "lxml")

    pages = [BASE_URL]
    pagination = soup.select("nav.pagination a, ul.pagination a, a.page-link")
    for link in pagination:
        href = link.get("href")
        if href:
            full = urljoin(BASE_URL, href)
            if full not in pages:
                pages.append(full)

    # If no pagination links were found, try query-string pattern
    if len(pages) == 1:
        # Probe pages until we get a redirect or empty list
        page_num = 2
        while True:
            test_url = f"{BASE_URL}?page={page_num}"
            try:
                resp = _get(test_url, session=session)
                soup = BeautifulSoup(resp.text, "lxml")
                if not soup.select("a[href*='recipient'], .recipient, .card, table tbody tr"):
                    break
                pages.append(test_url)
                page_num += 1
                if page_num > 200:  # safety cap
                    break
            except RuntimeError:
                break

    logger.info("Found %d page(s)", len(pages))
    return pages


# ---------------------------------------------------------------------------
# Detail extraction
# ---------------------------------------------------------------------------

def extract_recipient_links(page_url: str, session: requests.Session) -> list[str]:
    """Extract individual recipient profile URLs from a listing page."""
    resp = _get(page_url, session=session)
    soup = BeautifulSoup(resp.text, "lxml")
    links: list[str] = []
    for a in soup.select("a[href*='recipient'], a[href*='/recipients/']"):
        href = a.get("href")
        if href and "/recipients/" in href:
            full = urljoin(page_url, href)
            if full not in links:
                links.append(full)
    return links


def scrape_recipient(url: str, session: requests.Session) -> dict:
    """Scrape a single recipient detail page and return a dict."""
    resp = _get(url, session=session)
    soup = BeautifulSoup(resp.text, "lxml")

    def _text(selector: str) -> str:
        el = soup.select_one(selector)
        return el.get_text(strip=True) if el else ""

    def _meta(label: str) -> str:
        """Find a value next to a label element (common pattern on detail pages)."""
        for el in soup.find_all(["dt", "th", "strong", "span", "label"]):
            if label.lower() in el.get_text(strip=True).lower():
                sibling = el.find_next(["dd", "td", "span", "p", "div"])
                if sibling:
                    return sibling.get_text(strip=True)
        return ""

    # Photo
    photo_url = ""
    img = soup.select_one("img.recipient-photo, img.profile-photo, .recipient img, article img")
    if img:
        src = img.get("src") or img.get("data-src") or ""
        if src:
            photo_url = urljoin(url, src)

    full_name = (
        _text("h1")
        or _text(".recipient-name")
        or _text("title")
    )

    record = {
        "source_url": url,
        "full_name": full_name,
        "rank": _meta("Rank"),
        "branch": _meta("Branch") or _meta("Service"),
        "conflict": _meta("War") or _meta("Conflict"),
        "state": _meta("State") or _meta("Home"),
        "date_of_action": _meta("Date of Action") or _meta("Action Date"),
        "date_awarded": _meta("Date Awarded") or _meta("Award Date") or _meta("Date of Issue"),
        "citation": _meta("Citation") or _text(".citation"),
        "photo_url": photo_url,
        "birth_location": "",
    }
    return record


# ---------------------------------------------------------------------------
# Wikipedia enrichment
# ---------------------------------------------------------------------------

def lookup_birth_location(name: str, session: requests.Session) -> str:
    """Query the Wikipedia API for a person's birth place (best-effort)."""
    if not name:
        return ""
    try:
        params = {
            "action": "query",
            "list": "search",
            "srsearch": name,
            "srlimit": 1,
            "format": "json",
        }
        resp = _get(WIKIPEDIA_API, params=params, session=session)
        data = resp.json()
        results = data.get("query", {}).get("search", [])
        if not results:
            return ""

        page_title = results[0]["title"]
        # Fetch the extract
        params2 = {
            "action": "query",
            "titles": page_title,
            "prop": "extracts",
            "exintro": True,
            "explaintext": True,
            "format": "json",
        }
        resp2 = _get(WIKIPEDIA_API, params=params2, session=session)
        pages = resp2.json().get("query", {}).get("pages", {})
        for page in pages.values():
            extract = page.get("extract", "")
            # Simple heuristic: look for "born in …" pattern
            for marker in ["born in ", "born at ", "from "]:
                idx = extract.lower().find(marker)
                if idx != -1:
                    fragment = extract[idx + len(marker): idx + len(marker) + 100]
                    # Take up to the next period or parenthesis
                    end = len(fragment)
                    for ch in [".", ")", ",", ";"]:
                        pos = fragment.find(ch)
                        if pos != -1 and pos < end:
                            end = pos
                    location = fragment[:end].strip()
                    if location:
                        return location
    except Exception as exc:
        logger.debug("Wikipedia lookup failed for %s: %s", name, exc)
    return ""


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape Medal of Honor recipients from cmohs.org")
    parser.add_argument("--limit", type=int, default=0,
                        help="Max recipients to scrape (0 = all)")
    parser.add_argument("--skip-wikipedia", action="store_true",
                        help="Skip Wikipedia birth-location enrichment")
    parser.add_argument("--output", type=str, default=str(OUTPUT_FILE),
                        help="Output JSON path")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update(HEADERS)

    # 1. Discover pages
    pages = discover_pages(session)

    # 2. Collect profile links
    all_links: list[str] = []
    for page_url in pages:
        links = extract_recipient_links(page_url, session)
        logger.info("Page %s → %d recipient links", page_url, len(links))
        all_links.extend(links)

    # De-duplicate while preserving order
    seen: set[str] = set()
    unique_links: list[str] = []
    for link in all_links:
        if link not in seen:
            seen.add(link)
            unique_links.append(link)

    logger.info("Total unique recipient links: %d", len(unique_links))

    if args.limit:
        unique_links = unique_links[: args.limit]
        logger.info("Limiting to %d recipients", args.limit)

    # 3. Scrape each recipient
    recipients: list[dict] = []
    for i, link in enumerate(unique_links, 1):
        logger.info("[%d/%d] Scraping %s", i, len(unique_links), link)
        try:
            record = scrape_recipient(link, session)
            if not args.skip_wikipedia and record["full_name"]:
                record["birth_location"] = lookup_birth_location(
                    record["full_name"], session
                )
            recipients.append(record)
        except Exception as exc:
            logger.error("Failed to scrape %s: %s", link, exc)

    # 4. Write output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(recipients, fh, indent=2, ensure_ascii=False)

    logger.info("Wrote %d recipients to %s", len(recipients), output_path)


if __name__ == "__main__":
    main()
