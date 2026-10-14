#!/usr/bin/env python3
"""Audit Design Reservoir URLs without treating a reportable bad link as a program crash."""
import csv
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "resources.csv"
REPORT = ROOT / "link-report.json"
UA = "Mozilla/5.0 DesignReservoirLinkCheck/1.1"


def check_local(url):
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc:
        return {"status": None, "final_url": url, "state": "needs-review", "detail": "Unsupported URL scheme"}
    path = (ROOT / unquote(parsed.path).lstrip("/")).resolve()
    if not path.is_relative_to(ROOT):
        return {"status": None, "final_url": url, "state": "needs-review", "detail": "Path outside repository"}
    candidate = path / "index.html" if path.is_dir() else path
    if candidate.is_file():
        return {"status": 200, "final_url": url, "state": "ok", "detail": "Local file exists"}
    return {"status": 404, "final_url": url, "state": "needs-review", "detail": "Local file not found"}


def check(url):
    url = (url or "").strip()
    if not url:
        return {"status": None, "final_url": url, "state": "needs-review", "detail": "Empty URL"}
    scheme = urlsplit(url).scheme.lower()
    if not scheme:
        return check_local(url)
    if scheme not in ("http", "https"):
        return {"status": None, "final_url": url, "state": "needs-review", "detail": "Unsupported URL scheme"}

    headers = {"User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"}
    last_status = None
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=12) as response:
                return {"status": response.status, "final_url": response.geturl(), "state": "ok"}
        except urllib.error.HTTPError as exc:
            last_status = exc.code
            if method == "HEAD" and exc.code in (403, 405, 429):
                continue
            if exc.code in (403, 429):
                state = "restricted"
            elif 400 <= exc.code < 500:
                state = "needs-review"
            else:
                state = "temporary-error"
            return {"status": exc.code, "final_url": url, "state": state}
        except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
            if method == "HEAD":
                continue
            return {"status": last_status, "final_url": url, "state": "unreachable", "detail": str(exc)[:160]}
    return {"status": last_status, "final_url": url, "state": "unreachable"}


def main():
    with DATA.open(encoding="utf-8", newline="") as source:
        rows = list(csv.DictReader(source))
    results = []
    for row in rows:
        try:
            result = check(row.get("url"))
        except Exception as exc:
            result = {"status": None, "final_url": row.get("url"), "state": "needs-review", "detail": f"Check error: {str(exc)[:160]}"}
        result.update({"name": row.get("name", ""), "url": row.get("url", "")})
        results.append(result)
        time.sleep(0.1)

    review = [item for item in results if item["state"] not in ("ok", "restricted")]
    summary = {"checked": len(results), "needs_review": len(review), "results": results}
    REPORT.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"checked": len(results), "needs_review": len(review), "items": review}, indent=2, ensure_ascii=False))

    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as report:
            report.write(f"## Design Reservoir link audit\n\nChecked **{len(results)}** resources; **{len(review)}** need review.\n\n")
            report.write("A complete `link-report.json` is attached to this run.\n\n")
            for item in review[:30]:
                report.write(f"- {item['name']} — {item['state']} ({item.get('status')})\n")
    # Broken/restricted external links are reported, not a failure of the audit program.
    # This prevents repetitive failure emails while preserving the full list for review.


if __name__ == "__main__":
    main()
