# Design Reservoir

A curated academic-facing research index across design, futures and foresight, and STEAM (science, technology, engineering, arts and mathematics). It connects research, institutions, methods, education, professional pathways, opportunities and relevant recurring public platforms.

**Design Reservoir** began as a manually maintained collection created by [Brandie Janow](https://brandiejanow.com/) before ChatGPT existed. In 2026, the collection moved from spreadsheets and Airtable into GitHub so it could become a maintained, searchable, versioned public resource.

The repository is the source of truth. The human-readable master table lives in [`data/resources.csv`](data/resources.csv), and the public interface is generated from that file.

## Current status

- **211 active research and reference resource records**
- **hundreds of design disciplines** from *The Design Almanac 2026* in the searchable [Design Atlas](atlas/)
- *The Design Almanac 2026* has been reconciled section by section; changed, retired, generic, or unverified items are documented in [`data/almanac-review.csv`](data/almanac-review.csv)
- **76 active or recurring global design weeks and citywide design festivals** are maintained in the [Design Weeks Index](design-weeks/) and also appear in the main directory under **Resource type → Design Week** and in the Events Calendar as recurring platforms
- **29 current or forthcoming dated global events** across design, futures and foresight in the [Events Calendar](events/), including Texas Design Week Dallas; the calendar also includes a searchable directory of recurring Design Weeks
- ANTICIPATE is used as an event research source only: the calendar lists the individual applicable events, not ANTICIPATE itself as a directory entry
- [Knowledge of Design](https://brandiejanow.github.io/Knowledge-of-Design/index.html) is a resource in the main directory, linked to its official public website
- Places and events located in the Gulf and Middle East are excluded from active Design Reservoir listings, as of 14 October 2026. Earlier records remain recoverable through Git history.
- automated URL auditing checks resources, design weeks and dated events weekly
- a daily workflow removes dated events from the active calendar after their end date; previous records remain accessible through Git history
- completed annual festival editions are labelled as concluded until a future edition has been confirmed

## Design Almanac integration

The revised *Design Almanac 2026* is treated as a source for the Reservoir, not merely as inspiration. Its named organizations, museums and collections, mentorship pathways, cited research sources, global observances, and current non-design-week recurring platforms have been incorporated or explicitly logged for review.

The full import accounting is documented in [`data/almanac-import-manifest.csv`](data/almanac-import-manifest.csv).

The ten-family Design Atlas is preserved separately as structured data in [`data/design-atlas.csv`](data/design-atlas.csv), containing the full discipline map.

## What belongs here

Design Reservoir is an academic-facing knowledge resource spanning **futures / foresight, STEAM, and design**, not a design-only events listing. Appropriate sources include university labs and peer-reviewed research, government and intergovernmental datasets, credible think tanks, evidence-based methods, teaching resources, interdisciplinary STEAM projects, professional associations, museums, research archives, critical publications, substantive opportunities, and ongoing conferences or biennials relevant to the research fields.

**Editorial fit and quality**

- Prefer identifiable publishers, original research or primary-source documentation, specific learning/research value, clear provenance, and working public URLs.
- Evaluate submitted links as candidates: do not add everything received. Assess academic/research relevance, current operation, and whether an existing entry already covers the same resource.
- Distinguish verified official websites from independently validated academic findings; a working website alone is not evidence of research quality.
- Treat commercial/paid directories transparently, including eligibility, membership, or editorial-selection conditions.
- Keep permanent research records distinct from date-sensitive events and expiring competitions or calls. Remove completed or cancelled items from the **active events calendar**, preserving earlier states in Git history.
- Keep a recurring institution or festival only while current operation can be established; when its most recent edition has ended, do not describe that edition as upcoming.
- Do not add an inactive or superseded institution merely because its historic name appears on another index.

**Maintenance**

- [Weekly link audit](.github/workflows/link-check.yml): checks resources, design weeks and the events calendar and stores a report for manual review of broken or restricted URLs.
- [Daily event expiration](.github/workflows/refresh-events.yml): removes records whose end dates have passed from `data/events.csv`.
- Editorial checks of cancellations, replacements, new findings, classification quality, and evidence of continuing operation remain necessary: URL health alone cannot prove an event is happening.
- Preserve original references, publisher credit and licensing constraints; the dataset has no blanket open license.

## Files you may actually care about

- [`data/resources.csv`](data/resources.csv) — the active directory in a spreadsheet-like table
- [`data/design-atlas.csv`](data/design-atlas.csv) — the design-discipline Design Atlas
- [`data/design-weeks.csv`](data/design-weeks.csv) — separate Design Weeks dataset
- [`data/events.csv`](data/events.csv) — dated global events for the calendar
- [`data/almanac-import-manifest.csv`](data/almanac-import-manifest.csv) — what from the Almanac went where
- [`data/almanac-review.csv`](data/almanac-review.csv) — items intentionally held from the Almanac
- [`data/curation-review.csv`](data/curation-review.csv) — screened submissions and obsolete or unconfirmed resources, with reasons and next actions
- [`index.html`](index.html) — public Design Reservoir webpage
- [`events/index.html`](events/index.html) — date-organized Events Calendar

You do not need to edit the code files yourself to maintain the Reservoir.

## Publishing

Public site:

**https://brandiejanow.github.io/design-reservoir/**

## Licensing

No open license has been applied yet. Please do not republish the dataset wholesale without permission while the licensing approach is being finalized.
