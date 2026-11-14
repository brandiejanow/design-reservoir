#!/usr/bin/env python3
"""Remove completed dated events from the active calendar.

The Git commit history retains the prior listings for archival research.
This does not remove ongoing institutions, methods, publications, or recurring
design-week directory entries.
"""
import csv
import datetime as dt
import io
import re
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "data" / "events.csv"
ARCHIVE_PATH = PATH.with_name("events-archive.csv")


def main():
    today = dt.datetime.now(dt.timezone.utc).date()
    with PATH.open("r", encoding="utf-8", newline="") as handle:
        original = handle.read()
    reader = csv.DictReader(io.StringIO(original))
    fieldnames = list(reader.fieldnames or [])
    if not {"name", "start_date", "end_date", "url"}.issubset(fieldnames):
        raise ValueError("Unexpected events.csv column structure")
    kept = []
    removed = []
    for row in reader:
        if not row.get("name"):
            continue
        try:
            end = dt.date.fromisoformat(row["end_date"])
            dt.date.fromisoformat(row["start_date"])
        except (ValueError, KeyError) as exc:
            raise ValueError(f"Invalid date for {row.get('name')}") from exc
        if end < today:
            removed.append(row)
        else:
            kept.append(row)
    if not removed:
        print(f"No completed events. {len(kept)} upcoming/ongoing events remain.")
        return
    archived = []
    if ARCHIVE_PATH.exists():
        with ARCHIVE_PATH.open("r", encoding="utf-8", newline="") as handle:
            archived = list(csv.DictReader(handle))
    existing = {(x["name"], x["start_date"], x["end_date"], x["url"]) for x in archived}
    for row in removed:
        key = (row["name"], row["start_date"], row["end_date"], row["url"])
        if key not in existing:
            archived.append(row)
            existing.add(key)
    archive_out = io.StringIO(newline="")
    archive_writer = csv.DictWriter(archive_out, fieldnames=fieldnames, lineterminator="\\n")
    archive_writer.writeheader()
    archive_writer.writerows(sorted(archived, key=lambda row: (row["end_date"], row["name"]), reverse=True))
    ARCHIVE_PATH.write_text(archive_out.getvalue(), encoding="utf-8")
    out = io.StringIO(newline="")
    writer = csv.DictWriter(out, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    writer.writerows(kept)
    PATH.write_text(out.getvalue(), encoding="utf-8")
    readme = PATH.parents[1] / "README.md"
    if readme.is_file():
        original_readme = readme.read_text(encoding="utf-8")
        new_readme = re.sub(
            r"\*\*\d+ current or forthcoming dated global events\*\*",
            f"**{len(kept)} current or forthcoming dated global events**",
            original_readme,
            count=1,
        )
        if new_readme != original_readme:
            readme.write_text(new_readme, encoding="utf-8")
    print(f"Removed {len(removed)} completed events from active calendar: {', '.join(row['name'] for row in removed)}")


if __name__ == "__main__":
    main()
