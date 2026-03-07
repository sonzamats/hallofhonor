#!/usr/bin/env python3
"""
Home of Heroes supplemental data scraper.

Scrapes cross-reference data for all award types from
https://homeofheroes.com and writes structured records to a JSON file.

Output: data/homeofheroes_recipients.json
"""

import argparse
import json
import logging
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://homeofheroes.com"
AWARD_SECTIONS = {
    "medal-of-honor": "Medal of Honor",
    "distinguished-service-cross": "Distinguished Service Cross",
    "navy-cross": "Navy Cross",
    "silver-star": "Silver Star",
    "bronze-star": "Bronze Star",
    "purple-heart": "Purple Heart",
}

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "homeofheroes_recipients.json"

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
# Listing discovery
# ---------------------------------------------------------------------------

def discover_section_pages(section_slug: str, session: requests.Session) -> list[str]:
    """Discover listing pages for a given award section."""
    section_url = f"{BASE_URL}/{section_slug}/"
    logger.info("Discovering pages for section: %s", section_url)

    try:
        resp = _get(section_url, session=session)
    except RuntimeError:
        logger.warning("Could not reach section %s, skipping", section_url)
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    pages = [section_url]

    for a in soup.select("nav a, .pagination a, a.page-link, a.next, a[href*='page']"):
        href = a.get("href")
        if href:
            full = urljoin(section_url, href)
            if full not in pages:
                pages.append(full)

    # Probe pagination
    if len(pages) == 1:
        page_num = 2
        while page_num <= 200:
            test_url = f"{section_url}?page={page_num}"
            try:
                resp = _get(test_url, session=session)
                text = resp.text
                soup = BeautifulSoup(text, "lxml")
                if not soup.select("a[href], table tbody tr, .entry, article, .card"):
                    break
                pages.append(test_url)
                page_num += 1
            except RuntimeError:
                break

    logger.info("Section '%s' -> %d page(s)", section_slug, len(pages))
    return pages


def extract_recipient_links(page_url: str, session: requests.Session) -> list[str]:
    """Extract individual recipient profile URLs from a listing page."""
    resp = _get(page_url, session=session)
    soup = BeautifulSoup(resp.text, "lxml")
    links: list[str] = []
    for a in soup.select("a[href]"):
        href = a.get("href", "")
        # Accept links that look like individual profile/article pages
        if any(kw in href.lower() for kw in ["hero", "recipient", "profile", "veteran"]):
            full = urljoin(page_url, href)
            if full not in links and full != page_url:
                links.append(full)
    # Also try article-style links within the section
    for a in soup.select("article a[href], .entry-title a[href], h2 a[href], h3 a[href]"):
        full = urljoin(page_url, a.get("href", ""))
        if full not in links:
            links.append(full)
    return links


# ---------------------------------------------------------------------------
# Detail scraping
# ---------------------------------------------------------------------------

def scrape_recipient(url: str, award_name: str,
                     session: requests.Session) -> dict | None:
    """Scrape a single recipient detail page."""
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

    full_name = _text("h1") or _text("h2.entry-title") or _text(".name") or _text("title")
    if not full_name:
        return None

    photo_url = ""
    img = soup.select_one("img.photo, img.profile, article img, .entry-content img")
    if img:
        src = img.get("src") or img.get("data-src") or ""
        if src:
            photo_url = urljoin(url, src)

    # Extract the full body text as supplemental narrative
    narrative = ""
    content_el = soup.select_one(".entry-content, article, .content, .body, main")
    if content_el:
        paragraphs = content_el.find_all("p")
        narrative = " ".join(p.get_text(strip=True) for p in paragraphs[:10])

    return {
        "source_url": url,
        "award": award_name,
        "full_name": full_name,
        "rank": _meta("Rank"),
        "branch": _meta("Branch") or _meta("Service"),
        "conflict": _meta("War") or _meta("Conflict"),
        "state": _meta("State") or _meta("Home"),
        "unit": _meta("Unit"),
        "date_of_action": _meta("Date of Action") or _meta("Action Date"),
        "date_awarded": _meta("Date Awarded") or _meta("Award Date"),
        "citation": _meta("Citation") or _text(".citation"),
        "narrative": narrative,
        "photo_url": photo_url,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape supplemental hero data from homeofheroes.com"
    )
    parser.add_argument("--sections", nargs="*",
                        default=list(AWARD_SECTIONS.keys()),
                        choices=list(AWARD_SECTIONS.keys()),
                        help="Award sections to scrape")
    parser.add_argument("--limit", type=int, default=0,
                        help="Max recipients per section (0 = all)")
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

    all_recipients: list[dict] = []

    for slug in args.sections:
        award_name = AWARD_SECTIONS[slug]
        logger.info("=== Scraping section: %s ===", award_name)

        section_pages = discover_section_pages(slug, session)

        profile_links: list[str] = []
        for page_url in section_pages:
            links = extract_recipient_links(page_url, session)
            logger.info("Page %s -> %d links", page_url, len(links))
            profile_links.extend(links)

        # De-duplicate
        seen: set[str] = set()
        unique_links: list[str] = []
        for link in profile_links:
            if link not in seen:
                seen.add(link)
                unique_links.append(link)

        if args.limit:
            unique_links = unique_links[: args.limit]

        logger.info("Section '%s': %d unique profile links", award_name, len(unique_links))

        for i, link in enumerate(unique_links, 1):
            logger.info("[%d/%d] Scraping %s", i, len(unique_links), link)
            record = scrape_recipient(link, award_name, session)
            if record:
                all_recipients.append(record)

    # Write output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(all_recipients, fh, indent=2, ensure_ascii=False)

    logger.info("Wrote %d recipients to %s", len(all_recipients), output_path)


if __name__ == "__main__":
    main()
