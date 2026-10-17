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
            removed.append(row["name"])
        else:
            kept.append(row)
    if not removed:
        print(f"No completed events. {len(kept)} upcoming/ongoing events remain.")
        return
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
    print(f"Removed {len(removed)} completed events from active calendar: {', '.join(removed)}")


if __name__ == "__main__":
    main()
