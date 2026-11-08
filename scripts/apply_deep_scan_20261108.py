"""Apply a source-reviewed manifest without rewriting unrelated CSV records."""
import csv
import datetime as dt
import hashlib
import io
import json
from pathlib import Path
import subprocess
from urllib.parse import urlsplit, urlunsplit

MANIFEST = Path('data/deep-scan-manifest-2026-11-08.json')
AUDIT = Path('data/deep-scan-review-2026-11-08.json')
SUMMARY = Path('data/deep-scan-summary-2026-11-08.md')
if AUDIT.exists():
    raise SystemExit('Review already applied; refusing to apply twice.')
m = json.loads(MANIFEST.read_text(encoding='utf-8'))
today = dt.date.fromisoformat(m['review_date'])
rp, ep, wp, readme = map(Path, ['data/resources.csv', 'data/events.csv', 'data/design-weeks.csv', 'README.md'])
original = {p: p.read_bytes() for p in (rp, ep, wp, readme)}
for p, key in [(rp, 'expected_resource_blob'), (ep, 'expected_event_blob')]:
    actual = subprocess.check_output(['git', 'hash-object', str(p)], text=True).strip()
    if actual != m[key]:
        raise SystemExit(f'{p} changed since review; stop rather than overwrite concurrent work.')

def spans(text):
    lines = text.splitlines(keepends=True)
    reader = csv.reader(io.StringIO(text, newline=''))
    result, start = [], 0
    for row in reader:
        end = reader.line_num
        result.append({'row': row, 'raw': ''.join(lines[start:end]), 'line': start + 1})
        start = end
    if start != len(lines):
        raise ValueError('CSV span accounting failed')
    assert ''.join(x['raw'] for x in result) == text
    return result

def records(items):
    return [x for x in items[1:] if x['row'] and x['row'][0].strip()]

def serial(row):
    out = io.StringIO(newline='')
    csv.writer(out, lineterminator='\n').writerow(row)
    return out.getvalue()

def canonical(url):
    s = urlsplit(url.strip())
    return urlunsplit((s.scheme.lower(), (s.hostname or '').lower().removeprefix('www.'), s.path.rstrip('/'), s.query, ''))

def norm(value):
    return ' '.join(value.casefold().split())

def name_matches(name, aliases):
    n = norm(name)
    return any(n == norm(a) or n.startswith(norm(a) + ':') or n.startswith(norm(a) + ' (') for a in aliases)

rtext, etext = original[rp].decode('utf-8'), original[ep].decode('utf-8')
rs, es = spans(rtext), spans(etext)
rh, eh = rs[0]['row'], es[0]['row']
assert rh == 'name,description,url,resource_type,industries,keywords,status,last_checked,audit_note,previous_url,source'.split(',')
assert eh == 'start_date,end_date,name,city,country,region,category,description,url,source,keywords'.split(',')
rr, er = records(rs), records(es)
assert len(rr) == m['expected_core_count'], (len(rr), m['expected_core_count'])
assert len(er) == m['expected_event_count'], (len(er), m['expected_event_count'])
weeks = len(records(spans(original[wp].decode('utf-8'))))
baseline_issues = []
for label, items, head in [('resources', rr, rh), ('events', er, eh)]:
    for item in items:
        if len(item['row']) != len(head):
            baseline_issues.append({'collection': label, 'line': item['line'], 'name': item['row'][0 if label == 'resources' else 2], 'fields': len(item['row']), 'expected': len(head), 'action': 'Retained unchanged; pre-existing formatting requires separate source reconciliation.'})
existing = [dict(zip(rh, x['row'])) for x in rr]
updates, updated_names = {}, []
for change in m['resource_updates']:
    hits = [x for x in rr if x['row'][0] == change['name']]
    assert len(hits) == 1, f'Expected one exact resource to update: {change["name"]}'
    item = hits[0]
    assert len(item['row']) == len(rh)
    row = dict(zip(rh, item['row']))
    for key in ['description', 'audit_note', 'source']:
        row[key] = change[key]
    row['last_checked'] = m['review_date']
    row['status'] = 'Verified source'
    updates[item['line']] = serial([row[k] for k in rh])
    updated_names.append(change['name'])
added, duplicate_candidates, new_rows = [], [], []
for c in m['resource_candidates']:
    aliases = [c['name'], *c.get('aliases', [])]
    hits = [x for x in existing if canonical(x.get('url', '')) == canonical(c['url']) or name_matches(x['name'], aliases)]
    if hits:
        duplicate_candidates.append({'candidate': c['name'], 'covered_by': [x['name'] for x in hits], 'action': 'No duplicate record added'})
        continue
    assert urlsplit(c['url']).scheme == 'https'
    row = {k: c.get(k, '') for k in rh}
    row.update(status='Verified source', last_checked=m['review_date'], audit_note=c['evidence'] + ' ' + c['access_rights'], previous_url='', source='; '.join(c['sources']))
    assert all(isinstance(row[k], str) for k in rh)
    assert '\u2014' not in row['description']
    new_rows.append(serial([row[k] for k in rh]))
    existing.append(row)
    added.append({'name': c['name'], 'url': c['url'], 'group': c['group'], 'resource_type': c['resource_type'], 'access_rights': c['access_rights'], 'sources': c['sources']})
rbase = ''.join(updates.get(x['line'], x['raw']) for x in rs)
new_rtext = rbase + ('' if not new_rows or rbase.endswith('\n') else '\n') + ''.join(new_rows)
new_rs = spans(new_rtext)
assert len(records(new_rs)) == len(rr) + len(added)
for old, new in zip(rs, new_rs[:len(rs)]):
    assert new['raw'] == updates.get(old['line'], old['raw'])
assert all(len(x['row']) == len(rh) for x in new_rs[len(rs):] if x['row'])

retired, invalid_dates, kept_events, kept_chunks = [], [], [], []
for i, item in enumerate(es):
    row = item['row']
    if i == 0 or not row or not row[0].strip():
        kept_chunks.append(item['raw'])
        continue
    record = dict(zip(eh, row))
    try:
        end = dt.date.fromisoformat(record.get('end_date') or record['start_date'])
    except (ValueError, KeyError):
        invalid_dates.append({'name': record.get('name'), 'line': item['line'], 'action': 'Retained for review, not assumed elapsed'})
        kept_chunks.append(item['raw'])
        kept_events.append(record)
        continue
    if end < today:
        retired.append({'name': record.get('name'), 'start_date': record.get('start_date'), 'end_date': record.get('end_date'), 'url': record.get('url'), 'basis': 'Recorded end date has passed; not proof that the announced event took place. Earlier record remains in Git history.'})
    else:
        kept_chunks.append(item['raw'])
        kept_events.append(record)
event_added, event_duplicates, event_rows = [], [], []
for event in m['event_candidates']:
    assert dt.date.fromisoformat(event['end_date']) >= today
    assert dt.date.fromisoformat(event['start_date']) <= dt.date.fromisoformat(event['end_date'])
    if event['country'] == 'Saudi Arabia':
        assert int(event['start_date'][:4]) >= 2027
    hits = [x for x in kept_events if x.get('start_date') == event['start_date'] and (norm(x.get('name', '')) == norm(event['name']) or canonical(x.get('url', '')) == canonical(event['url']))]
    if hits:
        event_duplicates.append({'candidate': event['name'], 'covered_by': [x.get('name') for x in hits]})
        continue
    assert set(event) == set(eh)
    event_rows.append(serial([event[k] for k in eh]))
    kept_events.append(event)
    event_added.append(event)
ebase = ''.join(kept_chunks)
new_etext = ebase + ('' if not event_rows or ebase.endswith('\n') else '\n') + ''.join(event_rows)
new_es = spans(new_etext)
assert len(records(new_es)) == len(er) - len(retired) + len(event_added)
assert [x['raw'] for x in new_es[:len(kept_chunks)]] == kept_chunks
assert all(len(x['row']) == len(eh) for x in new_es[len(kept_chunks):] if x['row'])

before = {'resources': len(rr), 'research_tools': sum('Research Tool' in x['row'][3].split('; ') for x in rr), 'design_weeks': weeks, 'events': len(er), 'searchable_entries': len(rr) + weeks}
after = {'resources': len(records(new_rs)), 'research_tools': sum('Research Tool' in x['row'][3].split('; ') for x in records(new_rs)), 'design_weeks': weeks, 'events': len(records(new_es)), 'searchable_entries': len(records(new_rs)) + weeks}
md = original[readme].decode('utf-8')
for old, new in [(f"**{before['resources']} core resource records**", f"**{after['resources']} core resource records**"), (f"**{before['resources']} active research and reference resource records**", f"**{after['resources']} active research and reference resource records**"), (f"**{before['searchable_entries']} searchable entries**", f"**{after['searchable_entries']} searchable entries**"), (f"**{before['events']} current or forthcoming dated global events**", f"**{after['events']} current or forthcoming dated global events**")]:
    assert md.count(old) == 1, f'Missing or ambiguous README count: {old}'
    md = md.replace(old, new, 1)
assert after['research_tools'] == before['research_tools']
assert len(added) + len(duplicate_candidates) == len(m['resource_candidates'])
assert len(event_added) + len(event_duplicates) == len(m['event_candidates'])

audit = {'review_date': m['review_date'], 'scope': m['scope'], 'manifest': str(MANIFEST), 'manifest_sha256': hashlib.sha256(MANIFEST.read_bytes()).hexdigest(), 'before': before, 'after': after, 'resource_candidates_reviewed': len(m['resource_candidates']), 'resources_added': len(added), 'resources_updated': len(updated_names), 'resources_removed': 0, 'events_added': len(event_added), 'events_retired_by_recorded_end_date': len(retired), 'added': added, 'updated_existing': updated_names, 'duplicate_candidates_not_added': duplicate_candidates, 'events': event_added, 'event_duplicates_not_added': event_duplicates, 'retired': retired, 'held_and_excluded': m['review_cases'], 'covered_existing_collections': m['covered_existing_collections'], 'preexisting_schema_issues': baseline_issues, 'unresolved_event_dates': invalid_dates, 'rights': m['rights'], 'verification_limits': m['validation_scope'], 'validation': 'Exact pre-review blob guards passed. Full inventories parsed for duplicate and date checks. New rows conform to existing headers; all unrelated resource records and retained events preserved byte-for-byte. README counts reconciled. Design Weeks, Atlas, research-tool classifications and website code unchanged. No occurrence or cancellation inferred from HTTP status.', 'sha256_after': {'data/resources.csv': hashlib.sha256(new_rtext.encode()).hexdigest(), 'data/events.csv': hashlib.sha256(new_etext.encode()).hexdigest()}}
summary = ['# Design Reservoir: academic-resource scan', '', f"Reviewed {m['review_date']}", '', m['scope'], '', f"Published {len(added)} enduring resources and {len(event_added)} dated opportunities. Updated {len(updated_names)} existing resource. Retired {len(retired)} event records by their recorded end date.", '', '## Collection counts', '', '| Collection | Before | After |', '| --- | ---: | ---: |']
for key in ['resources', 'research_tools', 'design_weeks', 'events', 'searchable_entries']:
    summary.append(f"| {key.replace('_', ' ').title()} | {before[key]} | {after[key]} |")
for group in dict.fromkeys(x['group'] for x in added):
    summary.extend(['', '## ' + group, ''])
    for x in added:
        if x['group'] == group:
            summary.append(f"- [{x['name']}]({x['url']}). {x['access_rights']}")
summary.extend(['', '## Dated opportunities', ''])
for event in event_added:
    summary.extend([f"### {event['name']}", '', f"{event['start_date']} to {event['end_date']}. {event['description']}", '', f"[Organizer]({event['url']})", ''])
summary.extend(['## Existing correction', '', 'ACM Digital Library now distinguishes free access to ACM-published research after the January 2026 transition from paid Premium tools and author publication charges.', '', '## Held or excluded', ''])
for case in m['review_cases']:
    summary.append(f"- **{case['name']}: {case['decision']}.** {case['reason']}")
if retired:
    summary.extend(['', '## Removed elapsed records', ''])
    summary.extend(f"- {x['name']} (recorded end: {x['end_date']})." for x in retired)
summary.extend(['', '## Evidence and limits', '', m['validation_scope'], '', 'Source-by-source provenance and rights are preserved in the [review manifest](deep-scan-manifest-2026-11-08.json). Actual changes and validation results are preserved in the [publication audit](deep-scan-review-2026-11-08.json).', '', f'Pre-existing CSV formatting cases retained for separate reconciliation: {len(baseline_issues)}. No newly added row has a schema mismatch.', ''])
rp.write_bytes(new_rtext.encode('utf-8'))
ep.write_bytes(new_etext.encode('utf-8'))
readme.write_bytes(md.encode('utf-8'))
AUDIT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
SUMMARY.write_text('\n'.join(summary), encoding='utf-8')
assert wp.read_bytes() == original[wp]
print(json.dumps({'before': before, 'after': after, 'added': len(added), 'updated': updated_names, 'events_added': len(event_added), 'retired': len(retired), 'duplicates': duplicate_candidates, 'schema_review_cases': baseline_issues}, ensure_ascii=False, indent=2))
