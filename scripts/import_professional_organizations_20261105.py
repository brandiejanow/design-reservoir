"""One-time, source-verified curation import. Only nominated records are changed."""
from __future__ import annotations
import csv
import hashlib
import io
import json
import re
import unicodedata
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'data/professional-organizations-candidates-2026-11-05.json'
MASTER = ROOT / 'data/resources.csv'
REPORT = ROOT / 'data/professional-organizations-review-2026-11-05.json'
FIELDS = ['name', 'description', 'url', 'resource_type', 'industries', 'keywords', 'status', 'last_checked', 'audit_note', 'previous_url', 'source']

def normal_name(value: str) -> str:
    value = unicodedata.normalize('NFKD', value).casefold().strip()
    if value.startswith('the '):
        value = value[4:]
    return re.sub(r'[^a-z0-9]', '', value)

def normal_url(value: str) -> str:
    parsed = urlsplit(value.strip())
    host = (parsed.hostname or '').lower().removeprefix('www.')
    return host + parsed.path.rstrip('/').casefold()

def merge_terms(old: str, extra: str) -> str:
    terms = []
    seen = set()
    for item in (old + '; ' + extra).split(';'):
        item = item.strip()
        if item and item.casefold() not in seen:
            terms.append(item)
            seen.add(item.casefold())
    return '; '.join(terms)

def load_csv(text: str):
    lines = text.splitlines(keepends=True)
    reader = csv.reader(lines, strict=True)
    header = next(reader)
    if header != FIELDS:
        raise ValueError('Unexpected master schema; nothing changed')
    end = reader.line_num
    records = []
    for values in reader:
        start, end = end, reader.line_num
        if not any(values):
            continue
        if len(values) != len(FIELDS):
            raise ValueError(f'Malformed pre-existing record at line {start + 1}; nothing changed')
        records.append({'data': dict(zip(FIELDS, values)), 'start': start, 'end': end})
    return lines, records

def serialize(row: dict, newline: str) -> str:
    out = io.StringIO(newline='')
    csv.DictWriter(out, fieldnames=FIELDS, lineterminator=newline).writerow(row)
    return out.getvalue()

def count_csv(path: Path) -> int:
    with path.open(encoding='utf-8-sig', newline='') as handle:
        return sum(1 for row in csv.DictReader(handle) if any(row.values()))

def main():
    manifest_bytes = MANIFEST.read_bytes()
    manifest = json.loads(manifest_bytes)
    candidates = manifest['candidates']
    date = manifest['review_date']
    assert date == '2026-11-05'
    assert 45 <= len(candidates) <= 60
    assert len({normal_name(c['name']) for c in candidates}) == len(candidates)
    assert len({normal_url(c['url']) for c in candidates}) == len(candidates)
    for candidate in candidates:
        assert candidate['url'].startswith('https://')
        assert all(candidate.get(field) for field in ['name', 'description', 'url', 'resource_type', 'industries', 'keywords', 'source', 'note'])
        assert '\n' not in candidate['description']
    original = MASTER.read_bytes().decode('utf-8-sig')
    newline = '\r\n' if '\r\n' in original else '\n'
    lines, records = load_csv(original)
    before = [entry['data'].copy() for entry in records]
    additions, changes, retained = [], [], []
    used = set()
    common_note = 'Official organization and program sources reviewed 2026-11-05. '
    for candidate in candidates:
        names = {normal_name(candidate['name']), *(normal_name(a) for a in candidate.get('aliases', []))}
        urls = {normal_url(candidate['url']), *(normal_url(u) for u in candidate.get('legacy_urls', []))}
        matches = [i for i, entry in enumerate(records) if normal_name(entry['data']['name']) in names]
        if not matches:
            matches = [i for i, entry in enumerate(records) if normal_url(entry['data']['url']) in urls]
        if len(matches) > 1:
            raise ValueError(f'Ambiguous existing parent for {candidate["name"]}: {[records[i]["data"]["name"] for i in matches]}')
        note = common_note + candidate['note'] + ' ' + manifest['rights']
        if matches:
            i = matches[0]
            if i in used:
                raise ValueError('Two candidates resolve to one existing record; reconcile before import')
            used.add(i)
            old = records[i]['data'].copy()
            row = old.copy()
            row['name'] = candidate['name']
            row['url'] = candidate['url']
            if normal_url(old['url']) != normal_url(candidate['url']):
                row['previous_url'] = merge_terms(old['previous_url'], old['url'])
            # Retain prior descriptions; add source-supported search aliases and metadata.
            for field in ('resource_type', 'industries', 'keywords'):
                row[field] = merge_terms(old[field], candidate[field])
            row['status'] = 'Verified'
            row['last_checked'] = date
            if note not in row['audit_note']:
                row['audit_note'] = (row['audit_note'].rstrip() + ' ' + note).strip()
            row['source'] = merge_terms(old['source'], candidate['source'])
            records[i]['data'] = row
            info = {'name': row['name'], 'previous_name': old['name'], 'url': row['url']}
            if row != old:
                changes.append(info)
            else:
                retained.append(info)
        else:
            row = {field: candidate.get(field, '') for field in FIELDS}
            row.update(status='Verified', last_checked=date, audit_note=note, previous_url='')
            additions.append(row)
    if not additions and not changes and REPORT.exists():
        print('Verified import already applied; preserving original audit counts.')
        print(REPORT.read_text(encoding='utf-8'))
        return
    updated_lines = list(lines)
    for entry, old in reversed(list(zip(records, before))):
        if entry['data'] != old:
            updated_lines[entry['start']:entry['end']] = [serialize(entry['data'], newline)]
    updated = ''.join(updated_lines)
    if additions:
        if updated and not updated.endswith(('\r', '\n')):
            updated += newline
        updated += ''.join(serialize(row, newline) for row in additions)
    _, after_records = load_csv(updated)
    after = [entry['data'] for entry in after_records]
    assert len(after) == len(before) + len(additions)
    for i, old in enumerate(before):
        if i not in used:
            assert after[i] == old, f'Unrelated record changed: {old["name"]}'
    for new in additions:
        assert sum(normal_url(row['url']) == normal_url(new['url']) for row in after) == 1
    weeks = count_csv(ROOT / 'data/design-weeks.csv')
    events = count_csv(ROOT / 'data/events.csv')
    readme_path = ROOT / 'README.md'
    readme = readme_path.read_bytes().decode('utf-8')
    revised_readme = readme
    substitutions = [
        (r'\*\*\d+ core resource records\*\*', f'**{len(after)} core resource records**'),
        (r'\*\*\d+ active research and reference resource records\*\*', f'**{len(after)} active research and reference resource records**'),
        (r'\*\*\d+ searchable entries\*\*', f'**{len(after) + weeks} searchable entries**'),
    ]
    for pattern, replacement in substitutions:
        revised_readme, number = re.subn(pattern, replacement, revised_readme)
        assert number == 1, f'Readme count pattern changed: {pattern}'
    report = {
        'review_date': date,
        'manifest_sha256': hashlib.sha256(manifest_bytes).hexdigest(),
        'source': 'Curator-supplied affiliation names verified against official organization sources',
        'candidate_parent_resources': len(candidates),
        'before_core_resources': len(before),
        'added_count': len(additions),
        'updated_existing_count': len(changes),
        'retained_existing_count': len(retained),
        'after_core_resources': len(after),
        'recurring_design_weeks_unchanged': weeks,
        'searchable_entries': len(after) + weeks,
        'dated_events_unchanged': events,
        'added': [{'name': row['name'], 'url': row['url']} for row in additions],
        'updated_existing': changes,
        'retained_existing': retained,
        'credential_and_label_mappings': manifest['mappings'],
        'validation': 'CSV schema and row counts checked; no duplicate new destination URLs; every unrelated pre-existing resource preserved; event and design-week files unchanged; original descriptions retained for existing resources.',
        'rights': manifest['rights'],
    }
    MASTER.write_bytes(updated.encode('utf-8'))
    readme_path.write_bytes(revised_readme.encode('utf-8'))
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
