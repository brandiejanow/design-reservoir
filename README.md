# Design Reservoir

A curated global directory of design resources, knowledge platforms, institutions, tools, opportunities, research, museums, professional bodies, recurring design platforms, and reference material.

**Design Reservoir** began as a manually maintained collection created by [Brandie Janow](https://brandiejanow.com/) before ChatGPT existed. In 2026, the collection moved from spreadsheets and Airtable into GitHub so it could become a maintained, searchable, versioned public resource.

The repository is the source of truth. The human-readable master table lives in [`data/resources.csv`](data/resources.csv), and the public interface is generated from that file.

## Current status

- **182 active Design Reservoir records**
- **356 design disciplines** from *The Design Almanac 2026* in the searchable [Design Atlas](atlas/)
- *The Design Almanac 2026* has been reconciled section by section; changed, retired, generic, or unverified items are documented in [`data/almanac-review.csv`](data/almanac-review.csv)
- design weeks and citywide design festivals are maintained separately in the [Design Weeks Index](design-weeks/)
- automated link auditing is configured to run weekly

## Design Almanac integration

The revised *Design Almanac 2026* is treated as a source for the Reservoir, not merely as inspiration. Its named organizations, museums and collections, mentorship pathways, cited research sources, global observances, and current non-design-week recurring platforms have been incorporated or explicitly logged for review.

The full import accounting is documented in [`data/almanac-import-manifest.csv`](data/almanac-import-manifest.csv).

The ten-family Design Atlas is preserved separately as structured data in [`data/design-atlas.csv`](data/design-atlas.csv), containing all 356 disciplines.

## What belongs here

Design Reservoir is for resources that help people learn, research, connect, develop, find opportunities, understand design, or navigate the institutions and knowledge systems around it. That includes professional bodies, museums and collections, research societies, archives, indexes, education, mentorship, methods, tools, careers, communities, business, strategy, innovation, recurring conferences, fairs, biennales, and reference sources.

## Files you may actually care about

- [`data/resources.csv`](data/resources.csv) — the active directory in a spreadsheet-like table
- [`data/design-atlas.csv`](data/design-atlas.csv) — the 356-discipline Design Atlas
- [`data/design-weeks.csv`](data/design-weeks.csv) — separate Design Weeks dataset
- [`data/almanac-import-manifest.csv`](data/almanac-import-manifest.csv) — what from the Almanac went where
- [`data/almanac-review.csv`](data/almanac-review.csv) — items intentionally held for review
- [`index.html`](index.html) — public Design Reservoir webpage

You do not need to edit the code files yourself to maintain the Reservoir.

## Publishing

Public site:

**https://brandiejanow.github.io/design-reservoir/**

## Licensing

No open license has been applied yet. Please do not republish the dataset wholesale without permission while the licensing approach is being finalized.
