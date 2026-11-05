"""One-time, evidence-based RTD curation. No external requests or secrets required."""
import csv
import datetime as dt
import hashlib
import io
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

REVIEW_DATE = "2026-11-05"
CFP = "https://researchthroughdesign.org/call-for-contributions/"
SERIES = "https://researchthroughdesign.org/conference-series/"
ANNOUNCEMENT = "https://researchthroughdesign.org/rtd-roams-2027-full-call-for-contributions-launched/"
RESOURCE_FIELDS = "name,description,url,resource_type,industries,keywords,status,last_checked,audit_note,previous_url,source".split(",")
EVENT_FIELDS = "start_date,end_date,name,city,country,region,category,description,url,source,keywords".split(",")
REVIEW_FIELDS = "name,review_date,decision,reason,reference_url,next_action".split(",")

def read_table(path, expected=None):
    text = Path(path).read_text(encoding="utf-8")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    if expected is not None:
        assert reader.fieldnames == expected, (path, reader.fieldnames)
    assert all(None not in row and all(v is not None for v in row.values()) for row in rows), path
    return text, rows, reader.fieldnames

def append_records(text, records, fields):
    if not records:
        return text
    out = io.StringIO(newline="")
    writer = csv.DictWriter(out, fieldnames=fields, lineterminator="\n", extrasaction="raise")
    writer.writerows(records)
    return text + ("" if text.endswith("\n") else "\n") + out.getvalue()

def retire_expired(text):
    # Preserve the exact text and order of every retained logical CSV record.
    lines = text.splitlines(keepends=True)
    reader = csv.reader(lines)
    header = next(reader)
    assert header == EVENT_FIELDS
    previous = reader.line_num
    parts = ["".join(lines[:previous])]
    retained, retired = [], []
    for values in reader:
        end = reader.line_num
        block = "".join(lines[previous:end])
        previous = end
        if not values:
            parts.append(block)
            continue
        assert len(values) == len(header)
        row = dict(zip(header, values))
        date = row["end_date"] or row["start_date"]
        dt.date.fromisoformat(date)
        if date < REVIEW_DATE:
            retired.append(row)
        else:
            retained.append(row)
            parts.append(block)
    return "".join(parts), retained, retired

resource = {
    "name": "Research Through Design (RTD): Conference Series and Proceedings",
    "description": "Practice-based design research conference series with curated artifact exhibitions, facilitated roundtable discussions and publicly linked proceedings from its 2013-2019 editions. Returns in 2027 as university-hosted RTD Roams, welcoming researchers, independent practitioners and work in progress. The archive is separate from dated submission calls and conference meetings.",
    "url": SERIES,
    "resource_type": "Conference & Research Platform; Archive & Collection; Education & Research",
    "industries": "Academic Research; Research, History & Education; Design Education; Cross-disciplinary Design",
    "keywords": "Research Through Design; RTD; practice-based research; research through design; artifacts; roundtable discussion; material inquiry; situated knowledge; proceedings; Figshare; DOI; independent researchers",
    "status": "Verified",
    "last_checked": REVIEW_DATE,
    "audit_note": "Official conference-series archive, November 4 announcement and 2027 call inspected November 5, 2026. Series paused after 2019 and now has confirmed 2027 activity. Older simultaneity wording is inconsistent with the distinct July dates; use the dated call. Public links do not establish a blanket reuse license; check rights per proceeding. The current call promises DOI publication for accepted abstracts with attendance, not automatic journal acceptance. No third-party text or images reproduced.",
    "previous_url": "",
    "source": SERIES + "; " + ANNOUNCEMENT + "; " + CFP,
}

def event(start, end, name, city, country, region, description, keywords):
    return dict(zip(EVENT_FIELDS, [start, end, name, city, country, region,
        "Research, History & Education", description, CFP,
        "Official RTD Roams call and organizer announcement dated November 4, 2026; verified November 5, 2026. " + ANNOUNCEMENT,
        keywords]))

new_events = [
    event("2027-02-01", "2027-02-01", "RTD Roams 2027: Extended Abstract Submission Deadline", "Online submission", "Online", "Online",
        "Shared submission deadline for RTD Roams in Melbourne, York and Tokyo. Submit an anonymized abstract of up to 1,000 words excluding references and captions, plus 6-8 images at 300 dpi. Open to independent practitioners, researchers and students. One double-blind review round; work must include a research artifact or material trace. No submission fee; accepted authors must attend their selected site in person and pay registration. Submission template and final instructions remain forthcoming; no cutoff time or time zone is specified.",
        "RTD; Research Through Design; call for contributions; submission deadline; extended abstract; practice-based research; double-blind review; design research; 2027"),
    event("2027-07-06", "2027-07-08", "RTD Roams 2027: Naarm / Melbourne", "Melbourne / Naarm", "Australia", "Oceania",
        "Research Through Design gathering hosted by RMIT and Monash University on situated knowledge, materiality and relationality. Curated research artifacts and work in progress support roundtable discussions. In-person participation; no hybrid attendance. Shared abstract deadline February 1, 2027; organizer-listed standard registration AUD 350, with final fee details and concessions to follow. Accepted abstracts receive DOIs through Figshare subject to author attendance.",
        "RTD; Research Through Design; RMIT; Monash University; Melbourne; Naarm; practice-based research; artifacts; material inquiry; situated knowledge; design education"),
    event("2027-07-26", "2027-07-28", "RTD Roams 2027: Tokyo", "Tokyo", "Japan", "Asia",
        "Research Through Design gathering hosted by Musashino Art University on situated knowledge, materiality and relationality. Curated research artifacts and work in progress support roundtable discussions. In-person participation; no hybrid attendance. Shared abstract deadline February 1, 2027; organizer-listed standard registration JPY 54,000, with final fee details and concessions to follow. Accepted abstracts receive DOIs through Figshare subject to author attendance.",
        "RTD; Research Through Design; Musashino Art University; Tokyo; Japan; practice-based research; artifacts; material inquiry; situated knowledge; design education"),
]
review = {
    "name": "RTD Roams 2027: York exact dates",
    "review_date": REVIEW_DATE,
    "decision": "Hold exact-date calendar entry; institution and call are verified",
    "reason": "Organizer specifies only the week of July 12, 2027, at University of York with Royal College of Art and University of Brighton. No exact start/end days established. Older pages describe simultaneous meetings, but the new call gives separate July dates. Do not invent a July 12-14 or full-week event. Registration and submission are distinct; the call states in-person attendance is mandatory for accepted publication.",
    "reference_url": CFP + "; " + ANNOUNCEMENT,
    "next_action": "Publish the York meeting when exact dates are announced. Its February 1 submission deadline is already covered by the shared call entry. Check final fees, template, submission link and publication license individually.",
}

rtext, rrows, _ = read_table("data/resources.csv", RESOURCE_FIELDS)
etext, erows, _ = read_table("data/events.csv", EVENT_FIELDS)
wtext, wrows, _ = read_table("data/design-weeks.csv")
ctext, crows, _ = read_table("data/curation-review.csv", REVIEW_FIELDS)
readme = Path("README.md").read_text(encoding="utf-8")

existing_rtd = [r for r in rrows if urlsplit(r["url"]).netloc.lower().removeprefix("www.") == "researchthroughdesign.org"]
assert len(existing_rtd) <= 1, "Review existing RTD parent records before merging"
add_resources = [] if existing_rtd else [resource]
updated_rtext = append_records(rtext, add_resources, RESOURCE_FIELDS)
assert updated_rtext.startswith(rtext)

active_text, active_rows, retired = retire_expired(etext)
event_keys = {(r["name"].casefold(), r["start_date"]) for r in active_rows}
add_events = [r for r in new_events if (r["name"].casefold(), r["start_date"]) not in event_keys]
# A differently named pre-existing RTD event requires manual reconciliation.
assert not [r for r in active_rows if "researchthroughdesign.org" in r["url"] and r["name"] not in {x["name"] for x in new_events}], "Review existing RTD events"
for row in add_events:
    assert dt.date.fromisoformat(row["start_date"]) <= dt.date.fromisoformat(row["end_date"])
    assert row["end_date"] >= REVIEW_DATE
updated_etext = append_records(active_text, add_events, EVENT_FIELDS)
updated_ctext = append_records(ctext, [] if any(r["name"] == review["name"] for r in crows) else [review], REVIEW_FIELDS)

resource_count = len(rrows) + len(add_resources)
event_count = len(active_rows) + len(add_events)
week_count = len(wrows)
updated_readme = readme
for pattern, replacement in [
    (r"\*\*\d+ core resource records\*\*", f"**{resource_count} core resource records**"),
    (r"\*\*\d+ active research and reference resource records\*\*", f"**{resource_count} active research and reference resource records**"),
    (r"\*\*\d+ searchable entries\*\*", f"**{resource_count + week_count} searchable entries**"),
    (r"\*\*\d+ current or forthcoming dated global events\*\*", f"**{event_count} current or forthcoming dated global events**"),
]:
    updated_readme, n = re.subn(pattern, replacement, updated_readme)
    assert n == 1, pattern

assert list(csv.DictReader(io.StringIO(updated_rtext))) == rrows + add_resources
assert list(csv.DictReader(io.StringIO(updated_etext))) == active_rows + add_events
assert len({(r["name"].casefold(), r["start_date"]) for r in active_rows + add_events}) == event_count
assert all((r["end_date"] or r["start_date"]) >= REVIEW_DATE for r in active_rows + add_events)

outputs = {
    "data/resources.csv": updated_rtext,
    "data/events.csv": updated_etext,
    "data/curation-review.csv": updated_ctext,
    "README.md": updated_readme,
}
audit = {
    "review_date": REVIEW_DATE,
    "sources": [CFP, SERIES, ANNOUNCEMENT],
    "before": {"resources": len(rrows), "events": len(erows), "design_weeks": week_count},
    "after": {"resources": resource_count, "events": event_count, "design_weeks": week_count, "searchable_entries": resource_count + week_count},
    "resource_additions": add_resources,
    "event_additions": add_events,
    "retired_by_recorded_end_date": [{"name": r["name"], "start_date": r["start_date"], "end_date": r["end_date"], "url": r["url"]} for r in retired],
    "held_review": review,
    "rights": "Independent summaries only. No blanket proceedings license confirmed; use item-level publisher permissions. DOI allocation does not itself grant a reuse license.",
    "validation": "All pre-existing resource rows and all unexpired event rows preserved without content changes. Logical CSV rows checked against headers; new names and dates checked for duplicates. Expiration uses recorded end dates, not proof that an event took place. Design Weeks and all website code are unchanged.",
    "sha256_after": {p: hashlib.sha256(t.encode()).hexdigest() for p, t in outputs.items()},
}
for path, text in outputs.items():
    Path(path).write_text(text, encoding="utf-8", newline="")
Path("data/rtd-review-2026-11-05.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"before": audit["before"], "after": audit["after"], "added_resources": len(add_resources), "added_events": len(add_events), "expired_removed": len(retired)}, indent=2))
