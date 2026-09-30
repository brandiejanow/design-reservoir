#!/usr/bin/env python3
import csv, json, time, urllib.error, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"/"resources.csv"
REPORT=ROOT/"link-report.json"
UA="Mozilla/5.0 DesignReservoirLinkCheck/1.0"
def check(url):
    headers={"User-Agent":UA,"Accept":"text/html,application/xhtml+xml,*/*;q=0.8"}
    last=None
    for method in ("HEAD","GET"):
        req=urllib.request.Request(url,headers=headers,method=method)
        try:
            with urllib.request.urlopen(req,timeout=20) as res:
                return {"status":res.status,"final_url":res.geturl(),"state":"ok"}
        except urllib.error.HTTPError as e:
            last=e.code
            if method=="HEAD" and e.code in (403,405): continue
            if e.code in (403,429): return {"status":e.code,"final_url":url,"state":"restricted"}
            if 400<=e.code<500: return {"status":e.code,"final_url":url,"state":"needs-review"}
            return {"status":e.code,"final_url":url,"state":"temporary-error"}
        except Exception:
            if method=="HEAD": continue
            return {"status":last,"final_url":url,"state":"unreachable"}
    return {"status":last,"final_url":url,"state":"unreachable"}
rows=list(csv.DictReader(DATA.open(encoding="utf-8")))
results=[]
for r in rows:
    x=check(r["url"]); x.update({"name":r["name"],"url":r["url"]}); results.append(x); time.sleep(.1)
REPORT.write_text(json.dumps({"checked":len(results),"results":results},indent=2),encoding="utf-8")
bad=[r for r in results if r["state"] not in ("ok","restricted")]
print(json.dumps({"checked":len(results),"needs_review":len(bad),"items":bad},indent=2))
raise SystemExit(1 if bad else 0)
