#!/usr/bin/env python3
"""
POW Medal scraper.

Scrapes prisoner-of-war recipient data from https://www.pow-network.org
and writes structured records to a JSON file.

Output: data/pow_recipients.json
"""

import argparse
import json
import logging
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.pow-network.org"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "pow_recipients.json"

HEADERS = {
    "User-Agent": (
        "HallOfValor-Research-Bot/1.0 "
        "(educational project; contact@example.com)"
    ),
    "Accept": "text/html,application/xhtml+xml",
}

MAX_RETRIES = 3
RETRY_BACKOFF = 2
RATE_LIMIT_DELAY = 1

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Network helpers
# ---------------------------------------------------------------------------

def _get(url: str, session: requests.Session | None = None) -> requests.Response:
    """GET with retries, back-off, and rate-limit delay."""
    requester = session or requests
    last_exc = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requester.get(url, headers=HEADERS, timeout=30)
            resp.raise_for_status()
            time.sleep(RATE_LIMIT_DELAY)
            return resp
        except requests.RequestException as exc:
            last_exc = exc
            wait = RETRY_BACKOFF * attempt
            logger.warning(
                "Attempt %d/%d failed for %s: %s — retrying in %ds",
                attempt, MAX_RETRIES, url, exc, wait,
            )
            time.sleep(wait)
    raise RuntimeError(f"Failed after {MAX_RETRIES} attempts: {last_exc}") from last_exc


# ---------------------------------------------------------------------------
# Pagination & listing
# ---------------------------------------------------------------------------

def discover_listing_pages(session: requests.Session) -> list[str]:
    """Return all listing / index page URLs from the POW network site."""
    logger.info("Discovering listing pages from %s", BASE_URL)
    resp = _get(BASE_URL, session=session)
    soup = BeautifulSoup(resp.text, "lxml")

    pages: list[str] = [BASE_URL]

    # Try common listing patterns: alphabetical indexes, pagination links
    for a in soup.select("nav a, .pagination a, a.page-link, ul.pager a, a[href*='list'], a[href*='index']"):
        href = a.get("href")
        if href:
            full = urljoin(BASE_URL, href)
            if full not in pages:
                pages.append(full)

    # Probe query-string pagination if sparse
    if len(pages) == 1:
        page_num = 2
        while page_num <= 200:
            test_url = f"{BASE_URL}?page={page_num}"
            try:
                resp = _get(test_url, session=session)
                soup = BeautifulSoup(resp.text, "lxml")
                if not soup.select("a[href], table tbody tr, .recipient, .card, li"):
                    break
                pages.append(test_url)
                page_num += 1
            except RuntimeError:
                break

    logger.info("Found %d listing page(s)", len(pages))
    return pages


def extract_recipient_links(page_url: str, session: requests.Session) -> list[str]:
    """Extract individual POW profile URLs from a listing page."""
    resp = _get(page_url, session=session)
    soup = BeautifulSoup(resp.text, "lxml")
    links: list[str] = []
    for a in soup.select("a[href]"):
        href = a.get("href", "")
        if any(kw in href.lower() for kw in ["pow", "prisoner", "profile", "veteran", "detail"]):
            full = urljoin(page_url, href)
            if full not in links:
                links.append(full)
    return links


# ---------------------------------------------------------------------------
# Detail scraping
# ---------------------------------------------------------------------------

def scrape_recipient(url: str, session: requests.Session) -> dict | None:
    """Scrape a single POW recipient detail page."""
    try:
        resp = _get(url, session=session)
    except RuntimeError as exc:
        logger.error("Failed to fetch %s: %s", url, exc)
        return None

    soup = BeautifulSoup(resp.text, "lxml")

    def _text(selector: str) -> str:
        el = soup.select_one(selector)
        return el.get_text(strip=True) if el else ""

    def _meta(label: str) -> str:
        for el in soup.find_all(["dt", "th", "strong", "span", "label", "h3", "h4", "b"]):
            if label.lower() in el.get_text(strip=True).lower():
                sibling = el.find_next(["dd", "td", "span", "p", "div"])
                if sibling:
                    return sibling.get_text(strip=True)
        return ""

    full_name = _text("h1") or _text("h2") or _text(".name") or _text("title")
    if not full_name:
        return None

    photo_url = ""
    img = soup.select_one("img.photo, img.profile, .recipient img, article img, .detail img")
    if img:
        src = img.get("src") or img.get("data-src") or ""
        if src:
            photo_url = urljoin(url, src)

    return {
        "source_url": url,
        "award": "Prisoner of War Medal",
        "full_name": full_name,
        "rank": _meta("Rank"),
        "branch": _meta("Branch") or _meta("Service"),
        "conflict": _meta("War") or _meta("Conflict"),
        "state": _meta("State") or _meta("Home"),
        "unit": _meta("Unit"),
        "capture_date": _meta("Capture Date") or _meta("Date Captured"),
        "release_date": _meta("Release Date") or _meta("Date Released"),
        "camp": _meta("Camp") or _meta("Prison"),
        "date_awarded": _meta("Date Awarded") or _meta("Award Date"),
        "citation": _meta("Citation") or _text(".citation"),
        "photo_url": photo_url,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape POW Medal recipients from pow-network.org"
    )
    parser.add_argument("--limit", type=int, default=0,
                        help="Max recipients to scrape (0 = all)")
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

    # 1. Discover listing pages
    pages = discover_listing_pages(session)

    # 2. Collect profile links
    all_links: list[str] = []
    for page_url in pages:
        links = extract_recipient_links(page_url, session)
        logger.info("Page %s -> %d recipient links", page_url, len(links))
        all_links.extend(links)

    # De-duplicate
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
        record = scrape_recipient(link, session)
        if record:
            recipients.append(record)

    # 4. Write output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(recipients, fh, indent=2, ensure_ascii=False)

    logger.info("Wrote %d recipients to %s", len(recipients), output_path)


if __name__ == "__main__":
    main()
