#!/usr/bin/env python3
"""
Supabase database seeder.

Reads the master recipients JSON (and optionally an awards seed file) and
upserts data into Supabase tables:
  1. awards       — by slug
  2. recipients   — by name + branch
  3. recipient_awards — linking table

Uses the supabase-py client with credentials from .env.local.

Supports --dry-run mode to preview operations without writing.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MASTER = DATA_DIR / "master_recipients.json"
DEFAULT_AWARDS_SEED = DATA_DIR / "awards_seed.json"

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Slug helper
# ---------------------------------------------------------------------------

def _parse_date(date_str: str) -> str | None:
    """Parse a date string like 'June 10, 1951' to ISO 'YYYY-MM-DD' format."""
    if not date_str or not date_str.strip():
        return None
    from datetime import datetime
    for fmt in ("%B %d, %Y", "%b %d, %Y", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def slugify(text: str) -> str:
    """Convert a string to a URL-friendly slug."""
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")


_NAME_SUFFIXES = {"jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"}


def parse_names(rec: dict) -> tuple[str, str]:
    """Parse first and last name, handling suffixes like Jr, III.

    e.g. full_name='Frank Luke Jr' -> ('Frank', 'Luke')
    """
    first = rec.get("first_name", "")
    last = rec.get("last_name", "")
    full_name = rec.get("full_name", "")

    if last.lower().strip() in _NAME_SUFFIXES:
        parts = full_name.split()
        while len(parts) > 1 and parts[-1].lower().rstrip(".") in _NAME_SUFFIXES:
            parts.pop()
        if len(parts) >= 2:
            first, last = parts[0], parts[-1]
        elif parts:
            first, last = parts[0], "Unknown"

    if not first and full_name:
        first = full_name.split()[0]
    if not last and full_name:
        last = full_name.split()[-1]

    return first or "Unknown", last or "Unknown"


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_json(path: Path) -> list[dict]:
    """Load a JSON file and return its contents as a list of dicts."""
    if not path.exists():
        logger.error("File not found: %s", path)
        return []
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    if isinstance(data, list):
        return data
    logger.warning("Expected a JSON array in %s, got %s", path, type(data).__name__)
    return []


def build_awards_list(recipients: list[dict],
                      awards_seed: list[dict]) -> list[dict]:
    """Build a unique list of awards from the seed file and recipient data."""
    awards_by_slug: dict[str, dict] = {}

    # From seed file first (authoritative)
    for award in awards_seed:
        slug = award.get("slug") or slugify(award.get("name", ""))
        if slug:
            awards_by_slug[slug] = {
                "slug": slug,
                "name": award.get("name", slug),
                "description": award.get("description", ""),
                "precedence": award.get("precedence", 0),
            }

    # From recipient records
    for rec in recipients:
        for award_name in rec.get("awards", []):
            slug = slugify(award_name)
            if slug and slug not in awards_by_slug:
                awards_by_slug[slug] = {
                    "slug": slug,
                    "name": award_name,
                    "description": "",
                    "precedence": 0,
                }

    return list(awards_by_slug.values())


# ---------------------------------------------------------------------------
# Supabase operations
# ---------------------------------------------------------------------------

def upsert_awards(client, awards: list[dict], dry_run: bool) -> dict[str, str]:
    """Upsert awards and return a slug -> id mapping."""
    slug_to_id: dict[str, str] = {}
    inserted = updated = errors = 0

    for award in awards:
        if dry_run:
            logger.info("[DRY RUN] Would upsert award: %s", award["slug"])
            slug_to_id[award["slug"]] = f"dry-run-{award['slug']}"
            inserted += 1
            continue

        try:
            result = (
                client.table("awards")
                .upsert(award, on_conflict="slug")
                .execute()
            )
            if result.data:
                row = result.data[0]
                slug_to_id[award["slug"]] = row.get("id", "")
                inserted += 1
            else:
                errors += 1
                logger.warning("No data returned for award %s", award["slug"])
        except Exception as exc:
            errors += 1
            logger.error("Failed to upsert award %s: %s", award["slug"], exc)

    logger.info("Awards — inserted/updated: %d, errors: %d", inserted, errors)
    return slug_to_id


def deduplicate_source_data(recipients: list[dict]) -> list[dict]:
    """Remove duplicate records from source data before inserting."""
    seen: set[str] = set()
    unique: list[dict] = []

    for rec in recipients:
        # Prefer source_url as dedup key (each CMOHS page is unique per recipient)
        source_url = (rec.get("source_url") or "").lower().strip()
        if source_url:
            key = source_url
        else:
            first = (rec.get("first_name") or (rec.get("full_name") or "").split()[0] if rec.get("full_name") else "").lower().strip()
            last = (rec.get("last_name") or (rec.get("full_name") or "").split()[-1] if rec.get("full_name") else "").lower().strip()
            branch = (rec.get("branch") or "").lower().strip()
            conflict = (rec.get("conflict") or "").lower().strip()
            date_action = (rec.get("date_of_action") or "").lower().strip()
            key = f"{first}|{last}|{branch}|{conflict}|{date_action}"

        if key not in seen:
            seen.add(key)
            unique.append(rec)

    removed = len(recipients) - len(unique)
    if removed > 0:
        logger.info("Deduplicated source data: removed %d duplicates (%d -> %d)",
                     removed, len(recipients), len(unique))
    return unique


def clear_existing_data(client, dry_run: bool) -> None:
    """Clear recipient_awards and recipients tables for idempotent re-seeding."""
    if dry_run:
        logger.info("[DRY RUN] Would clear recipient_awards and recipients tables")
        return

    logger.info("Clearing existing recipient_awards...")
    page_size = 1000
    while True:
        resp = client.table("recipient_awards").select("id").range(0, page_size - 1).execute()
        if not resp.data:
            break
        ids = [r["id"] for r in resp.data]
        client.table("recipient_awards").delete().in_("id", ids).execute()

    logger.info("Clearing existing recipients...")
    while True:
        resp = client.table("recipients").select("id").range(0, page_size - 1).execute()
        if not resp.data:
            break
        ids = [r["id"] for r in resp.data]
        client.table("recipients").delete().in_("id", ids).execute()

    logger.info("Tables cleared.")


def upsert_recipients(client, recipients: list[dict],
                       dry_run: bool) -> list[dict]:
    """Upsert recipients and return records with their DB ids."""
    # Deduplicate source data before inserting
    recipients = deduplicate_source_data(recipients)

    results: list[dict] = []
    inserted = updated = errors = 0
    batch_size = 50

    for i in range(0, len(recipients), batch_size):
        batch = recipients[i: i + batch_size]
        rows = []
        for rec in batch:
            # Parse first/last name, handling suffixes like Jr, III
            first_name, last_name = parse_names(rec)

            # Parse date strings to ISO format (YYYY-MM-DD) for Supabase
            date_of_action = _parse_date(rec.get("date_of_action", ""))
            date_awarded = _parse_date(rec.get("date_awarded", ""))
            date_of_birth = _parse_date(rec.get("date_of_birth", ""))
            date_of_death = _parse_date(rec.get("date_of_death", ""))

            # Parse entered_service_state from accredited location
            entered_service = rec.get("entered_service_state", "") or rec.get("state", "")

            row = {
                "first_name": first_name,
                "last_name": last_name,
                "rank": rec.get("rank", ""),
                "branch": rec.get("branch", ""),
                "conflict": rec.get("conflict", ""),
                "entered_service_state": entered_service,
                "date_of_action": date_of_action,
                "date_awarded": date_awarded,
                "date_of_birth": date_of_birth,
                "date_of_death": date_of_death,
                "posthumous": rec.get("posthumous", False),
                "citation": rec.get("citation", ""),
                "photo_url": rec.get("photo_url", ""),
                "action_location_name": rec.get("action_location_name", ""),
            }
            # Only include non-empty values
            row = {k: v for k, v in row.items() if v is not None and v != ""}
            # first_name and last_name are required
            row.setdefault("first_name", "Unknown")
            row.setdefault("last_name", "Unknown")
            rows.append(row)

        if dry_run:
            for row in rows:
                name = f"{row.get('first_name', '')} {row.get('last_name', '')}"
                logger.info("[DRY RUN] Would upsert recipient: %s (%s)",
                            name, row.get("branch", ""))
                results.append({**row, "id": f"dry-run-{slugify(name)}"})
            inserted += len(rows)
            continue

        try:
            resp = (
                client.table("recipients")
                .insert(rows)
                .execute()
            )
            if resp.data:
                results.extend(resp.data)
                inserted += len(resp.data)
            else:
                errors += len(rows)
        except Exception as exc:
            errors += len(rows)
            logger.error("Failed to insert recipient batch %d–%d: %s",
                         i, i + len(rows), exc)

    logger.info("Recipients — inserted/updated: %d, errors: %d", inserted, errors)
    return results


def link_recipient_awards(client, recipients: list[dict],
                          slug_to_id: dict[str, str],
                          db_recipients: list[dict],
                          dry_run: bool) -> None:
    """Create recipient_awards linking rows."""
    # Build a lookup from (name, branch) -> db id
    name_branch_to_id: dict[tuple[str, str], str] = {}
    for db_rec in db_recipients:
        key = (db_rec.get("full_name", "").lower(), db_rec.get("branch", "").lower())
        name_branch_to_id[key] = db_rec.get("id", "")

    inserted = errors = 0
    rows: list[dict] = []

    for rec in recipients:
        name_key = (rec.get("full_name", "").lower(), rec.get("branch", "").lower())
        recipient_id = name_branch_to_id.get(name_key)
        if not recipient_id:
            continue

        for award_name in rec.get("awards", []):
            slug = slugify(award_name)
            award_id = slug_to_id.get(slug)
            if not award_id:
                continue

            rows.append({
                "recipient_id": recipient_id,
                "award_id": award_id,
            })

    if not rows:
        logger.info("No recipient-award links to create.")
        return

    if dry_run:
        logger.info("[DRY RUN] Would create %d recipient_award links", len(rows))
        return

    batch_size = 100
    for i in range(0, len(rows), batch_size):
        batch = rows[i: i + batch_size]
        try:
            resp = (
                client.table("recipient_awards")
                .upsert(batch, on_conflict="recipient_id,award_id")
                .execute()
            )
            if resp.data:
                inserted += len(resp.data)
            else:
                errors += len(batch)
        except Exception as exc:
            errors += len(batch)
            logger.error("Failed to upsert recipient_awards batch %d–%d: %s",
                         i, i + len(batch), exc)

    logger.info("Recipient-award links — inserted: %d, errors: %d", inserted, errors)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed Supabase with scraped recipient data"
    )
    parser.add_argument("--master", type=str, default=str(DEFAULT_MASTER),
                        help="Path to master_recipients.json")
    parser.add_argument("--awards-seed", type=str, default=str(DEFAULT_AWARDS_SEED),
                        help="Path to awards_seed.json (optional)")
    parser.add_argument("--env-file", type=str,
                        default=str(PROJECT_ROOT / ".env.local"),
                        help="Path to .env file with Supabase credentials")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview operations without writing to database")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    # Load environment
    env_path = Path(args.env_file)
    if env_path.exists():
        load_dotenv(env_path)
        logger.info("Loaded environment from %s", env_path)
    else:
        logger.warning("Env file not found: %s — falling back to environment", env_path)

    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "") or os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")

    if not supabase_url or not supabase_key:
        logger.error(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set "
            "(in %s or environment)", args.env_file
        )
        sys.exit(1)

    # Initialize Supabase client
    if args.dry_run:
        logger.info("=== DRY RUN MODE — no database writes ===")
        client = None
    else:
        try:
            from supabase import create_client
            client = create_client(supabase_url, supabase_key)
            logger.info("Connected to Supabase: %s", supabase_url)
        except Exception as exc:
            logger.error("Failed to create Supabase client: %s", exc)
            sys.exit(1)

    # Load data
    master_path = Path(args.master)
    recipients = load_json(master_path)
    logger.info("Loaded %d recipients from %s", len(recipients), master_path)

    awards_seed_path = Path(args.awards_seed)
    awards_seed = load_json(awards_seed_path) if awards_seed_path.exists() else []
    logger.info("Loaded %d award definitions from seed", len(awards_seed))

    if not recipients:
        logger.error("No recipients to seed. Run scrapers first.")
        sys.exit(1)

    # Build awards list
    awards = build_awards_list(recipients, awards_seed)
    logger.info("Total unique awards to upsert: %d", len(awards))

    # 0. Clear existing data for idempotent re-seeding
    clear_existing_data(client, args.dry_run)

    # 1. Upsert awards
    slug_to_id = upsert_awards(client, awards, args.dry_run)

    # 2. Upsert recipients
    db_recipients = upsert_recipients(client, recipients, args.dry_run)

    # 3. Link recipients to awards
    link_recipient_awards(client, recipients, slug_to_id, db_recipients, args.dry_run)

    # Summary
    print("\n" + "=" * 60)
    print("SUPABASE SEED SUMMARY")
    print("=" * 60)
    print(f"  Mode:                {'DRY RUN' if args.dry_run else 'LIVE'}")
    print(f"  Awards processed:    {len(awards)}")
    print(f"  Recipients processed:{len(recipients)}")
    print(f"  DB recipients returned: {len(db_recipients)}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
