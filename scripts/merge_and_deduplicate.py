#!/usr/bin/env python3
"""
Master merge and deduplication script.

Loads all scraped JSON files from the data/ directory, matches recipients
across sources using normalized names, branch, conflict, and approximate
dates, then produces a deduplicated master file.

Matching criteria:
  - Normalized name (lowercase, stripped titles/suffixes) via fuzzy match
  - Branch of service
  - Conflict / war
  - Date of action within 1 year (365 days)

Records with match confidence below 90% are flagged for manual review.

Outputs:
  - data/master_recipients.json   (deduplicated master list)
  - data/flagged_for_review.json  (low-confidence matches)
"""

import argparse
import json
import logging
import re
from collections import defaultdict
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT_MASTER = DATA_DIR / "master_recipients.json"
OUTPUT_FLAGGED = DATA_DIR / "flagged_for_review.json"

# Files produced by individual scrapers
SOURCE_FILES = [
    "medal_of_honor_recipients.json",
    "militarytimes_recipients.json",
    "purple_heart_recipients.json",
    "pow_recipients.json",
    "homeofheroes_recipients.json",
]

CONFIDENCE_THRESHOLD = 0.90
DATE_TOLERANCE_DAYS = 365

# Titles and suffixes to strip for name normalization
TITLE_PREFIXES = [
    "pvt", "pfc", "cpl", "sgt", "ssgt", "tsgt", "msgt", "smsgt", "cmsgt",
    "spc", "sp4", "sp5", "sp6",
    "1sg", "sgm", "csm", "sma",
    "2lt", "1lt", "cpt", "maj", "ltc", "col", "bg", "mg", "ltg", "gen",
    "ens", "ltjg", "lt", "lcdr", "cdr", "capt", "radm", "vadm", "adm",
    "wo1", "cw2", "cw3", "cw4", "cw5",
    "private", "corporal", "sergeant", "captain", "major", "colonel",
    "general", "admiral", "lieutenant", "commander", "ensign",
    "first", "second", "staff", "master", "chief", "senior",
    "mr", "mrs", "ms", "dr",
]
TITLE_SUFFIXES = [
    "jr", "sr", "ii", "iii", "iv", "v",
    "usn", "usa", "usmc", "usaf", "uscg", "ret",
    "ph.d", "md", "dds",
]

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Normalization helpers
# ---------------------------------------------------------------------------

def normalize_name(name: str) -> str:
    """Lowercase, strip titles/suffixes/punctuation, collapse whitespace."""
    if not name:
        return ""
    n = name.lower().strip()
    # Remove punctuation except hyphens and apostrophes in names
    n = re.sub(r"[^\w\s'-]", " ", n)
    # Remove title prefixes and suffixes
    tokens = n.split()
    filtered: list[str] = []
    for tok in tokens:
        clean = tok.strip("., ")
        if clean in TITLE_PREFIXES or clean in TITLE_SUFFIXES:
            continue
        filtered.append(clean)
    return " ".join(filtered).strip()


def normalize_branch(branch: str) -> str:
    """Map branch strings to canonical values."""
    if not branch:
        return ""
    b = branch.lower().strip()
    if any(k in b for k in ["army", "usa"]):
        return "army"
    if any(k in b for k in ["navy", "usn"]):
        return "navy"
    if any(k in b for k in ["marine", "usmc"]):
        return "marines"
    if any(k in b for k in ["air force", "usaf", "air corps"]):
        return "air_force"
    if any(k in b for k in ["coast guard", "uscg"]):
        return "coast_guard"
    return b


def parse_date_loose(date_str: str) -> datetime | None:
    """Best-effort date parsing for various formats."""
    if not date_str:
        return None
    date_str = date_str.strip()
    for fmt in [
        "%Y-%m-%d", "%m/%d/%Y", "%B %d, %Y", "%b %d, %Y",
        "%d %B %Y", "%d %b %Y", "%Y", "%m/%d/%y",
    ]:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    # Try extracting just a year
    match = re.search(r"\b(1[789]\d{2}|20[0-2]\d)\b", date_str)
    if match:
        return datetime(int(match.group(1)), 6, 15)  # mid-year approximation
    return None


def dates_within_tolerance(d1: datetime | None, d2: datetime | None) -> bool:
    """True if both dates are None or within DATE_TOLERANCE_DAYS of each other."""
    if d1 is None or d2 is None:
        return True  # can't disprove, so allow
    return abs((d1 - d2).days) <= DATE_TOLERANCE_DAYS


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------

def compute_match_score(rec_a: dict, rec_b: dict) -> float:
    """Compute a 0.0–1.0 match confidence between two records."""
    name_a = normalize_name(rec_a.get("full_name", ""))
    name_b = normalize_name(rec_b.get("full_name", ""))

    if not name_a or not name_b:
        return 0.0

    name_score = SequenceMatcher(None, name_a, name_b).ratio()

    # Branch match
    branch_a = normalize_branch(rec_a.get("branch", ""))
    branch_b = normalize_branch(rec_b.get("branch", ""))
    branch_match = 1.0
    if branch_a and branch_b and branch_a != branch_b:
        branch_match = 0.0

    # Conflict match
    conflict_a = (rec_a.get("conflict", "") or "").lower().strip()
    conflict_b = (rec_b.get("conflict", "") or "").lower().strip()
    conflict_match = 1.0
    if conflict_a and conflict_b:
        conflict_match = SequenceMatcher(None, conflict_a, conflict_b).ratio()

    # Date match
    date_a = parse_date_loose(rec_a.get("date_of_action", ""))
    date_b = parse_date_loose(rec_b.get("date_of_action", ""))
    date_match = 1.0 if dates_within_tolerance(date_a, date_b) else 0.0

    # Weighted combination: name is most important
    score = (
        name_score * 0.55
        + branch_match * 0.15
        + conflict_match * 0.15
        + date_match * 0.15
    )
    return round(score, 4)


def merge_records(existing: dict, new_rec: dict) -> dict:
    """Merge a new record into an existing master record, filling blanks."""
    merged = dict(existing)

    # Merge top-level scalar fields (prefer non-empty values)
    skip_keys = {"awards", "sources", "match_scores"}
    for key, val in new_rec.items():
        if key in skip_keys:
            continue
        if val and not merged.get(key):
            merged[key] = val

    # Aggregate awards
    new_award = new_rec.get("award", "")
    if new_award:
        awards = merged.setdefault("awards", [])
        if new_award not in awards:
            awards.append(new_award)

    # Track source URLs
    src = new_rec.get("source_url", "")
    if src:
        sources = merged.setdefault("sources", [])
        if src not in sources:
            sources.append(src)

    return merged


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Merge and deduplicate scraped recipient data"
    )
    parser.add_argument("--data-dir", type=str, default=str(DATA_DIR),
                        help="Directory containing scraped JSON files")
    parser.add_argument("--output", type=str, default=str(OUTPUT_MASTER),
                        help="Master output JSON path")
    parser.add_argument("--flagged-output", type=str,
                        default=str(OUTPUT_FLAGGED),
                        help="Flagged-for-review output JSON path")
    parser.add_argument("--threshold", type=float, default=CONFIDENCE_THRESHOLD,
                        help="Match confidence threshold (0.0–1.0)")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    data_dir = Path(args.data_dir)

    # 1. Load all source files
    all_records: list[dict] = []
    for filename in SOURCE_FILES:
        filepath = data_dir / filename
        if not filepath.exists():
            logger.warning("Source file not found, skipping: %s", filepath)
            continue
        with open(filepath, "r", encoding="utf-8") as fh:
            records = json.load(fh)
        logger.info("Loaded %d records from %s", len(records), filepath.name)
        for rec in records:
            rec["_source_file"] = filename
        all_records.extend(records)

    if not all_records:
        logger.error("No records loaded. Ensure scrapers have run first.")
        return

    logger.info("Total records loaded: %d", len(all_records))

    # 2. Build master list via greedy matching
    master: list[dict] = []
    flagged: list[dict] = []
    stats = defaultdict(int)

    for rec in all_records:
        best_idx = -1
        best_score = 0.0

        norm_name = normalize_name(rec.get("full_name", ""))
        if not norm_name:
            stats["skipped_no_name"] += 1
            continue

        for idx, existing in enumerate(master):
            score = compute_match_score(rec, existing)
            if score > best_score:
                best_score = score
                best_idx = idx

        if best_score >= args.threshold and best_idx >= 0:
            # Merge into existing record
            master[best_idx] = merge_records(master[best_idx], rec)
            master[best_idx].setdefault("match_scores", []).append(
                round(best_score, 4)
            )
            stats["merged"] += 1
        elif best_score > 0.5 and best_idx >= 0:
            # Below threshold but plausible — flag for review
            flagged.append({
                "new_record": rec,
                "matched_to": master[best_idx].get("full_name", ""),
                "match_score": best_score,
                "reason": f"Confidence {best_score:.2%} below threshold {args.threshold:.0%}",
            })
            # Still add as separate entry
            entry = dict(rec)
            entry.setdefault("awards", [])
            if rec.get("award"):
                entry["awards"].append(rec["award"])
            entry["sources"] = [rec.get("source_url", "")]
            master.append(entry)
            stats["flagged"] += 1
        else:
            # New unique recipient
            entry = dict(rec)
            entry.setdefault("awards", [])
            if rec.get("award"):
                entry["awards"].append(rec["award"])
            entry["sources"] = [rec.get("source_url", "")]
            master.append(entry)
            stats["new"] += 1

    # 3. Clean up internal keys
    for rec in master:
        rec.pop("_source_file", None)

    # 4. Write outputs
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(master, fh, indent=2, ensure_ascii=False)

    flagged_path = Path(args.flagged_output)
    flagged_path.parent.mkdir(parents=True, exist_ok=True)
    with open(flagged_path, "w", encoding="utf-8") as fh:
        json.dump(flagged, fh, indent=2, ensure_ascii=False)

    # 5. Print summary
    print("\n" + "=" * 60)
    print("MERGE & DEDUPLICATION SUMMARY")
    print("=" * 60)
    print(f"  Total input records:     {len(all_records)}")
    print(f"  Master output records:   {len(master)}")
    print(f"  New unique recipients:   {stats['new']}")
    print(f"  Merged (deduplicated):   {stats['merged']}")
    print(f"  Flagged for review:      {stats['flagged']}")
    print(f"  Skipped (no name):       {stats['skipped_no_name']}")
    print(f"  Confidence threshold:    {args.threshold:.0%}")
    print(f"\n  Master file:   {output_path}")
    print(f"  Flagged file:  {flagged_path}")
    print("=" * 60 + "\n")

    logger.info("Done. %d master records, %d flagged.", len(master), len(flagged))


if __name__ == "__main__":
    main()
