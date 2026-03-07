#!/usr/bin/env python3
"""
Military Times Valor scraper.

Scrapes Silver Star, Bronze Star, and Distinguished Flying Cross recipient
data from https://militarytimes.com/valor/.  Falls back to Selenium when
pages are JS-rendered and requests alone returns insufficient content.

Output: data/militarytimes_recipients.json
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

BASE_URL = "https://militarytimes.com/valor/"
CATEGORIES = {
    "silver-star": "Silver Star",
    "bronze-star": "Bronze Star",
    "dfc": "Distinguished Flying Cross",
}

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "militarytimes_recipients.json"

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
            logger.warning("Attempt %d/%d failed for %s: %s — retrying in %ds",
                           attempt, MAX_RETRIES, url, exc, wait)
            time.sleep(wait)
    raise RuntimeError(f"Failed after {MAX_RETRIES} attempts: {last_exc}") from last_exc


# ---------------------------------------------------------------------------
# Selenium fallback
# ---------------------------------------------------------------------------

_driver = None


def _get_selenium_driver():
    """Lazily create a headless Chrome driver."""
    global _driver
    if _driver is not None:
        return _driver
    try:
        from selenium.webdriver import Chrome
        from selenium.webdriver.chrome.options import Options

        opts = Options()
        opts.add_argument("--headless")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument(f"user-agent={HEADERS['User-Agent']}")
        _driver = Chrome(options=opts)
        return _driver
    except Exception as exc:
        logger.error("Selenium driver init failed: %s", exc)
        return None


def _get_with_selenium(url: str) -> str | None:
    """Fetch page source via Selenium (JS-rendered)."""
    driver = _get_selenium_driver()
    if driver is None:
        return None
    try:
        driver.get(url)
        time.sleep(3)  # wait for JS rendering
        return driver.page_source
    except Exception as exc:
        logger.error("Selenium fetch failed for %s: %s", url, exc)
        return None


def _fetch_page(url: str, session: requests.Session) -> BeautifulSoup:
    """Fetch a page; fall back to Selenium if requests yields sparse content."""
    try:
        resp = _get(url, session=session)
        soup = BeautifulSoup(resp.text, "lxml")
        # Heuristic: if the page body is very short it's likely JS-rendered
        body_text = soup.get_text(strip=True)
        if len(body_text) > 500:
            return soup
    except RuntimeError:
        pass

    logger.info("Falling back to Selenium for %s", url)
    html = _get_with_selenium(url)
    if html:
        time.sleep(RATE_LIMIT_DELAY)
        return BeautifulSoup(html, "lxml")

    # Return whatever we have
    return BeautifulSoup("", "lxml")


# ---------------------------------------------------------------------------
# Scraping logic
# ---------------------------------------------------------------------------

def scrape_category_listing(category_slug: str, award_name: str,
                            session: requests.Session) -> list[str]:
    """Return profile URLs for a given award category."""
    url = urljoin(BASE_URL, category_slug + "/")
    links: list[str] = []
    page = 1

    while True:
        page_url = url if page == 1 else f"{url}?page={page}"
        logger.info("Listing page: %s", page_url)
        soup = _fetch_page(page_url, session)

        new_links: list[str] = []
        for a in soup.select("a[href]"):
            href = a.get("href", "")
            if "/valor/" in href and href not in links and href != url:
                full = urljoin(page_url, href)
                if full not in links:
                    new_links.append(full)
                    links.append(full)

        if not new_links:
            break
        page += 1
        if page > 200:
            break

    logger.info("Category '%s' → %d profile links", award_name, len(links))
    return links


def scrape_profile(url: str, award_name: str,
                   session: requests.Session) -> dict | None:
    """Scrape a single recipient profile page."""
    try:
        soup = _fetch_page(url, session)
    except Exception as exc:
        logger.error("Failed to load %s: %s", url, exc)
        return None

    def _text(selector: str) -> str:
        el = soup.select_one(selector)
        return el.get_text(strip=True) if el else ""

    def _meta(label: str) -> str:
        for el in soup.find_all(["dt", "th", "strong", "span", "label", "h3", "h4"]):
            if label.lower() in el.get_text(strip=True).lower():
                sibling = el.find_next(["dd", "td", "span", "p", "div"])
                if sibling:
                    return sibling.get_text(strip=True)
        return ""

    full_name = _text("h1") or _text(".name") or _text("title")
    if not full_name:
        return None

    return {
        "source_url": url,
        "award": award_name,
        "full_name": full_name,
        "rank": _meta("Rank"),
        "branch": _meta("Branch") or _meta("Service"),
        "conflict": _meta("War") or _meta("Conflict"),
        "unit": _meta("Unit"),
        "date_of_action": _meta("Date of Action") or _meta("Action Date"),
        "citation": _meta("Citation") or _text(".citation"),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape Military Times Valor recipients"
    )
    parser.add_argument("--categories", nargs="*", default=list(CATEGORIES.keys()),
                        choices=list(CATEGORIES.keys()),
                        help="Award categories to scrape")
    parser.add_argument("--limit", type=int, default=0,
                        help="Max recipients per category (0 = all)")
    parser.add_argument("--output", type=str, default=str(OUTPUT_FILE))
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update(HEADERS)

    all_recipients: list[dict] = []

    for slug in args.categories:
        award_name = CATEGORIES[slug]
        logger.info("=== Scraping category: %s ===", award_name)

        profile_urls = scrape_category_listing(slug, award_name, session)
        if args.limit:
            profile_urls = profile_urls[: args.limit]

        for i, purl in enumerate(profile_urls, 1):
            logger.info("[%d/%d] %s", i, len(profile_urls), purl)
            record = scrape_profile(purl, award_name, session)
            if record:
                all_recipients.append(record)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(all_recipients, fh, indent=2, ensure_ascii=False)

    logger.info("Wrote %d recipients to %s", len(all_recipients), output_path)

    # Clean up Selenium
    global _driver
    if _driver is not None:
        try:
            _driver.quit()
        except Exception:
            pass


if __name__ == "__main__":
    main()
