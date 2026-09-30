# Design Reservoir

A curated global directory of design resources, knowledge platforms, institutions, tools, and opportunities.

**Design Reservoir** began as a manually maintained collection created by [Brandie Janow](https://brandiejanow.com/) before ChatGPT existed. In 2026, the collection moved from spreadsheets and Airtable into GitHub so it could become a maintained, searchable, versioned public resource.

The repository is the source of truth. The active directory lives in [`data/resources.json`](data/resources.json); retired or obsolete resources are preserved in [`data/archive.json`](data/archive.json) so the history of the collection is not lost.

## What belongs here

Design Reservoir is for resources that help people learn, research, connect, develop, find opportunities, or understand something in design. That includes:

- professional bodies, design councils, and national institutions
- research societies, archives, indexes, and knowledge platforms
- education, mentorship, and professional-development resources
- methods, toolkits, prompts, and design-system resources
- career networks, communities, and opportunities
- business, strategy, innovation, and design-management resources
- cross-disciplinary design platforms and futures resources

The discipline taxonomy is adapted from **The Design Almanac 2026**, published by Knowledge of Design. It uses ten overlapping design families, plus a cross-disciplinary category.

## Current status

- **93 active resources**
- **3 retired resources** preserved in the archive
- links audited on **2026-09-30**
- global expansion is ongoing

## Repository structure

```text
data/
  resources.json       canonical active directory
  archive.json         retired / obsolete resources
  taxonomy.json        design families and resource types

site/
  index.html
  styles.css
  app.js                public search + filtering interface

scripts/
  check_links.py        automated URL health check

.github/
  workflows/
    pages.yml           publishes the static site
    link-check.yml      scheduled link audit
  ISSUE_TEMPLATE/
    suggest-resource.yml
    correction.yml
```

## Contribute

Use the repository issue forms to suggest a resource or flag a correction. Resources are reviewed for relevance, currency, and usefulness before being added.

## Licensing

No open license has been applied yet. Please do not republish the dataset wholesale without permission while the licensing approach is being finalized.
