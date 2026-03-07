#!/usr/bin/env python3
"""
Medal of Honor recipient scraper.

Scrapes recipient data from https://www.cmohs.org/recipients, paginates
through all list pages, and enriches records with birth-location data
from the Wikipedia API.

Output: data/medal_of_honor_recipients.json
"""
from __future__ import annotations

import argparse
import json
import logging
import re
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
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Non-recipient paths under /recipients/ to skip
SKIP_SLUGS = {"connect", "overview", "page"}

MAX_RETRIES = 3
RETRY_BACKOFF = 2  # seconds, doubled each retry
RATE_LIMIT_DELAY = 0.5  # seconds between requests

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

def discover_total_pages(session: requests.Session) -> int:
    """Find the last page number from pagination links on the first page."""
    resp = _get(BASE_URL, session=session)
    soup = BeautifulSoup(resp.text, "lxml")

    max_page = 1
    for a in soup.select("a[href*='/recipients/page/']"):
        href = a.get("href", "")
        m = re.search(r"/page/(\d+)", href)
        if m:
            max_page = max(max_page, int(m.group(1)))

    return max_page


def build_page_urls(total_pages: int) -> list[str]:
    """Generate all listing page URLs."""
    urls = [BASE_URL]  # page 1 has no /page/ suffix
    for p in range(2, total_pages + 1):
        urls.append(f"{BASE_URL}/page/{p}")
    return urls


# ---------------------------------------------------------------------------
# Listing page extraction
# ---------------------------------------------------------------------------

def is_recipient_url(href: str) -> bool:
    """Return True if the URL points to an individual recipient profile."""
    if not href or "/recipients/" not in href:
        return False
    # Extract the slug after /recipients/
    parts = href.rstrip("/").split("/recipients/")
    if len(parts) < 2:
        return False
    slug = parts[-1].split("/")[0]
    if slug in SKIP_SLUGS or slug.startswith("page"):
        return False
    # Must look like a name slug (contains letters and hyphens)
    if not re.match(r"^[a-z]", slug):
        return False
    return True


def extract_recipient_links(page_url: str, session: requests.Session) -> list[str]:
    """Extract individual recipient profile URLs from a listing page."""
    resp = _get(page_url, session=session)
    soup = BeautifulSoup(resp.text, "lxml")

    # The listing uses <section class="ribbon-teaser-grid"> with <a class="block">
    links: list[str] = []
    for a in soup.select("section#recipients_grid a.block, a[href*='/recipients/']"):
        href = a.get("href", "")
        full = urljoin(page_url, href)
        if is_recipient_url(full) and full not in links:
            links.append(full)

    return links


# ---------------------------------------------------------------------------
# Detail page extraction
# ---------------------------------------------------------------------------

def scrape_recipient(url: str, session: requests.Session) -> dict:
    """Scrape a single recipient detail page and return a dict."""
    resp = _get(url, session=session)
    soup = BeautifulSoup(resp.text, "lxml")

    def _text(selector: str) -> str:
        el = soup.select_one(selector)
        return el.get_text(strip=True) if el else ""

    # The detail page has fields like "Rank:Corporal" as concatenated text
    # in dt/dd or similar pairs. Extract key-value pairs from the page.
    fields: dict[str, str] = {}
    # Look for patterns like "Label:Value" in dedicated detail sections
    for el in soup.find_all(["dt", "li", "div"]):
        text = el.get_text(strip=True)
        # Match "Key:Value" patterns (the site concatenates label and value)
        for key in ["Rank", "Conflict/Era", "Military Service Branch",
                     "Medal of Honor Action Date", "Medal of Honor Action Place",
                     "Accredited to", "Awarded Posthumously",
                     "Presentation Date & Details", "Born", "Died",
                     "Unit/Command", "Buried"]:
            if text.startswith(key + ":"):
                value = text[len(key) + 1:].strip()
                fields[key] = value
                break

    # Name — use the h1 with class "flyweight" (the actual recipient name),
    # or fall back to og:title, then generic h1
    name_el = soup.select_one("h1.flyweight")
    if name_el:
        full_name = name_el.get_text(strip=True)
    else:
        og = soup.select_one('meta[property="og:title"]')
        if og and og.get("content"):
            full_name = og["content"].split("|")[0].strip()
        else:
            full_name = _text("h1").strip()

    # Photo - look for the main recipient image
    photo_url = ""
    for img in soup.select("img[data-src], img[src]"):
        src = img.get("data-src") or img.get("src") or ""
        if "/media/" in src and "fallback" not in src:
            photo_url = urljoin(url, src)
            break

    # Citation text
    citation = ""
    citation_el = soup.select_one(".citation, .citation-text, [class*=citation]")
    if citation_el:
        citation = citation_el.get_text(strip=True)
    if not citation:
        # Look for a long paragraph that looks like a citation
        for p in soup.find_all("p"):
            text = p.get_text(strip=True)
            if len(text) > 200 and ("conspicuous" in text.lower()
                                     or "gallantry" in text.lower()
                                     or "heroism" in text.lower()
                                     or "above and beyond" in text.lower()):
                citation = text
                break

    # Parse born field for birth details
    born_raw = fields.get("Born", "")
    date_of_birth = ""
    birth_location = ""
    if born_raw:
        # Format: "August 12, 1931, Terre Haute, Vigo County, Indiana, United States"
        parts = born_raw.split(", ", 2)
        if len(parts) >= 2:
            # Try to detect if first part is month+day and second is year
            m = re.match(r"^(\w+ \d+), (\d{4})", born_raw)
            if m:
                date_of_birth = f"{m.group(1)}, {m.group(2)}"
                rest = born_raw[m.end():].lstrip(", ")
                birth_location = rest
            else:
                birth_location = born_raw

    died_raw = fields.get("Died", "")
    date_of_death = ""
    if died_raw:
        m = re.match(r"^(\w+ \d+), (\d{4})", died_raw)
        if m:
            date_of_death = f"{m.group(1)}, {m.group(2)}"

    # Parse name into first/last
    name_parts = full_name.split()
    first_name = name_parts[0] if name_parts else ""
    last_name = name_parts[-1] if len(name_parts) > 1 else ""

    # Parse action date
    action_date_raw = fields.get("Medal of Honor Action Date", "")

    # Parse "Awarded Posthumously"
    posthumous = fields.get("Awarded Posthumously", "").lower() == "yes"

    # Parse accredited state
    accredited = fields.get("Accredited to", "")

    record = {
        "source_url": url,
        "full_name": full_name,
        "first_name": first_name,
        "last_name": last_name,
        "rank": fields.get("Rank", ""),
        "branch": fields.get("Military Service Branch", ""),
        "conflict": fields.get("Conflict/Era", ""),
        "entered_service_state": accredited,
        "date_of_action": action_date_raw,
        "date_awarded": "",  # presentation date is complex, skip for now
        "date_of_birth": date_of_birth,
        "date_of_death": date_of_death,
        "posthumous": posthumous,
        "citation": citation,
        "photo_url": photo_url,
        "birth_location": birth_location,
        "action_location_name": fields.get("Medal of Honor Action Place", ""),
        "unit": fields.get("Unit/Command", ""),
        "awards": ["Medal of Honor"],
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
            for marker in ["born in ", "born at ", "from "]:
                idx = extract.lower().find(marker)
                if idx != -1:
                    fragment = extract[idx + len(marker): idx + len(marker) + 100]
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

    # 1. Discover total pages
    logger.info("Discovering pagination from %s", BASE_URL)
    total_pages = discover_total_pages(session)
    logger.info("Found %d pages", total_pages)

    page_urls = build_page_urls(total_pages)

    # 2. Collect profile links from all listing pages
    all_links: list[str] = []
    for i, page_url in enumerate(page_urls, 1):
        try:
            links = extract_recipient_links(page_url, session)
            logger.info("Page %d/%d → %d recipient links", i, total_pages, len(links))
            all_links.extend(links)
        except Exception as exc:
            logger.error("Failed to scrape listing page %s: %s", page_url, exc)

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

    # 3. Scrape each recipient detail page
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

        # Save progress every 100 recipients
        if i % 100 == 0:
            output_path = Path(args.output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as fh:
                json.dump(recipients, fh, indent=2, ensure_ascii=False)
            logger.info("Progress saved: %d recipients", len(recipients))

    # 4. Write final output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(recipients, fh, indent=2, ensure_ascii=False)

    logger.info("Wrote %d recipients to %s", len(recipients), output_path)


if __name__ == "__main__":
    main()
