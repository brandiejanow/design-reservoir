#!/usr/bin/env python3
"""Audit every source URL and local page route used by Design Reservoir.

A working URL is *not* proof that an event is current or that research is reliable.
External access blocks are reported as restricted, never automatically removed.
"""
import csv
import datetime as dt
import html.parser
import json
import os
import pathlib
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import unquote, urljoin, urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_FILES = [
    ("resources", ROOT / "data/resources.csv"),
    ("design-weeks", ROOT / "data/design-weeks.csv"),
    ("events", ROOT / "data/events.csv"),
]
REPORT = ROOT / "data/link-audit-latest.json"
UA = "Mozilla/5.0 (compatible; DesignReservoir/2026 editorial-link-audit)"
PAGE_BASE = "https://brandiejanow.github.io/design-reservoir/"
TIMEOUT = 9


class Links(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
    def handle_starttag(self, tag, attrs):
        if tag not in {"a", "link", "script"}:
            return
        d = dict(attrs)
        target = d.get("href") if tag != "script" else d.get("src")
        if target:
            self.urls.append(target)


def check_local(url, containing_path=None):
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc:
        return {"state": "needs-review", "detail": "URL is not relative"}
    if not parsed.path or parsed.path == "#":
        return {"state": "ok", "http_status": None, "detail": "On-page anchor"}
    base = containing_path.parent if containing_path else ROOT
    destination = (base / unquote(parsed.path).lstrip("/")).resolve()
    if not destination.is_relative_to(ROOT):
        return {"state": "needs-review", "http_status": None, "detail": "Outside repository"}
    candidate = destination / "index.html" if destination.is_dir() else destination
    if candidate.is_file():
        return {"state": "ok", "http_status": 200}
    return {"state": "needs-review", "http_status": 404, "detail": "Local route/file not found"}


def request_status(url, method):
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as reply:
        return reply.status, reply.geturl()


def check(url, local_context=None):
    url = (url or "").strip()
    if not url:
        return {"state": "needs-review", "http_status": None, "detail": "Empty URL"}
    p = urlsplit(url)
    if not p.scheme and not p.netloc:
        return check_local(url, local_context)
    if p.scheme not in {"https", "http"}:
        return {"state": "needs-review", "http_status": None, "detail": "Unsupported scheme"}
    failures = []
    for method in ("HEAD", "GET"):
        try:
            code, final = request_status(url, method)
            changed = final.rstrip("/") != url.rstrip("/")
            return {"state": "redirect" if changed else "ok", "http_status": code, "final_url": final}
        except urllib.error.HTTPError as e:
            failures.append(str(e.code))
            if method == "HEAD":
                continue
            if e.code in (401, 403, 406, 429, 451):
                state = "restricted"
            elif e.code in (404, 410):
                state = "needs-review"
            elif 400 <= e.code < 500:
                state = "needs-review"
            else:
                state = "temporary-error"
            return {"state": state, "http_status": e.code, "detail": f"HTTP {e.code}"}
        except (OSError, TimeoutError, ValueError) as e:
            failures.append(type(e).__name__)
            if method == "HEAD":
                continue
            return {"state": "unreachable", "http_status": None, "detail": "; ".join(failures)[:180]}
    return {"state": "unreachable", "http_status": None, "detail": "; ".join(failures)}


def records():
    found = []
    for collection, path in DATA_FILES:
        with path.open(encoding="utf-8", newline="") as handle:
            for row in csv.DictReader(handle):
                if not row.get("name"):
                    continue
                found.append({"collection": collection, "name": row["name"], "url": row.get("url", "")})
    # The same website can serve multiple records, but every record still gets its own status.
    for path in ROOT.rglob("*.html"):
        if ".git" in path.parts:
            continue
        rel = str(path.relative_to(ROOT))
        links = Links()
        try:
            links.feed(path.read_text(encoding="utf-8"))
        except UnicodeError:
            continue
        for url in links.urls:
            if url.startswith(("#", "mailto:", "tel:", "javascript:")) or url.startswith("//"):
                continue
            # Local files are checked with the directory of the HTML file as base.
            found.append({"collection": "page-link", "name": rel, "url": url,
                          "context": rel})
    return found


def main():
    entries = records()
    # Deduplicate network fetches, but retain per-entry provenance for auditability.
    unique = {}
    for entry in entries:
        key = (entry["url"], entry.get("context", ""))
        unique.setdefault(key, []).append(entry)
    checked = {}
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {}
        for (url, context) in unique:
            page = (ROOT / context) if context else None
            futures[pool.submit(check, url, page)] = (url, context)
        for fut in as_completed(futures):
            key = futures[fut]
            try:
                checked[key] = fut.result()
            except Exception as exc:
                checked[key] = {"state": "needs-review", "http_status": None,
                                "detail": f"Unexpected audit exception: {exc}"[:180]}
    output = []
    for entry in entries:
        status = checked[(entry["url"], entry.get("context", ""))]
        output.append({**entry, **status})
    tally = {}
    for entry in output:
        tally[entry["state"]] = tally.get(entry["state"], 0) + 1
    today = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
    report = {
        "audit_date_utc": today,
        "scope": "All three source CSV URL fields and static HTML href/src links",
        "note": "A 200 response verifies reachability only; it does not verify event dates, editorial suitability or peer review. HTTP 403/429 is not proof of a dead link.",
        "total_records_tested": len(output),
        "unique_requests": len(unique),
        "states": tally,
        "items": output,
    }
    REPORT.parent.mkdir(exist_ok=True, parents=True)
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    flagged = [e for e in output if e["state"] not in {"ok", "redirect", "restricted"}]
    print(json.dumps({"date": today, "items": len(output), "states": tally, "review": flagged[:35]}, indent=2))
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as handle:
            handle.write(f"## Design Reservoir full link audit: {today}\n\n")
            handle.write(f"Checked **{len(output)}** linked records, {len(unique)} unique requests.\n\n")
            handle.write(f"States: {json.dumps(tally)}.\n\n")
            handle.write("Manual review: " + str(len(flagged)) + " flags. See the current workflow artifact.\n\n")
            for item in flagged[:30]:
                handle.write(f"- {item['collection']} · {item['name']} · {item['state']} · {item['url']}\n")


if __name__ == "__main__":
    main()
