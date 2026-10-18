# Design Reservoir

A curated academic-facing research index across design, futures and foresight, and STEAM (science, technology, engineering, arts and mathematics). It connects research, institutions, methods, education, professional pathways, opportunities and relevant recurring public platforms.

**Design Reservoir** began as a manually maintained collection created by [Brandie Janow](https://brandiejanow.com/) before ChatGPT existed. In 2026, the collection moved from spreadsheets and Airtable into GitHub so it could become a maintained, searchable, versioned public resource.

The repository is the source of truth. The human-readable master table lives in [`data/resources.csv`](data/resources.csv), and the public interface is generated from that file. Research tools are selected from the main directory using **Resource type → Research Tool**. The separate research-tools page remains available for direct links but is not part of the main navigation.

## Current status

- **260 active research and reference resource records**, including **34 research tools** classified by research workflow
- **365 classified Design Atlas entries** across ten families, with two practices intentionally appearing in more than one family in the searchable [Design Atlas](atlas/)
- *The Design Almanac 2026* has been reconciled section by section; changed, retired, generic, or unverified items are documented in [`data/almanac-review.csv`](data/almanac-review.csv)
- **78 active or recurring global design weeks and citywide design festivals** are maintained in the [Design Weeks Index](design-weeks/) and also appear in the main directory under **Resource type → Design Week** and in the Events Calendar as recurring platforms
- **43 current or forthcoming dated global events** across design, futures and foresight in the [Events Calendar](events/), including Texas Design Week Dallas; the calendar also includes a searchable directory of recurring Design Weeks
- ANTICIPATE is used as an event research source only: the calendar lists the individual applicable events, not ANTICIPATE itself as a directory entry
- [Knowledge of Design](https://brandiejanow.github.io/Knowledge-of-Design/index.html) is a resource in the main directory, linked to its official public website
- Academic and cultural research sources from the Middle East and Gulf are included when relevant. Current events outside Saudi Arabia are assessed individually, while Saudi event listings remain restricted to eligible 2027-and-later programs. Earlier editorial decisions remain accessible through Git history.
- automated URL auditing checks resource entries, design weeks, dated events and internal page links on source updates and weekly
- a daily workflow removes dated events from the active calendar after their end date; previous records remain accessible through Git history
- completed annual festival editions are labelled as concluded until a future edition has been confirmed

## Research tools and scholarly workflows

The [Research Tools Index](research-tools/) is curated around scholarly discovery, assessing evidence, writing and references, qualitative/field research, data analysis and visualization, and open publication/collaboration. It includes tools used in futures, STEAM, cultural research, humanities and design; research software is not a substitute for original evidence. Source descriptions disclose scope limitations, publishing access, AI reliability and relevant commercial restrictions when known.

- The master tool records remain in [`data/resources.csv`](data/resources.csv) under resource type `Research Tool`.
- [`data/research-tool-workflows.csv`](data/research-tool-workflows.csv) holds only the workflow classifications for the separate page, avoiding duplicated descriptions and URLs.
- [`data/research-tool-review.csv`](data/research-tool-review.csv) records deliberately excluded, transitional or unresolved research tools. An inaccessible website alone does not establish that a provider is defunct.
- New candidates require review of their original provider documentation and a demonstrable research use; tools that are discontinued, unverifiable, overly narrow or duplicative should not automatically remain active.


**Browse by page or resource type**

The top navigation contains pages only: About, Design Atlas, Design Weeks, and Events Calendar. Research tools, academic journals, archives and other record types belong to the filters in the main index. The Design Atlas page is no longer counted as its own resource record.

**Browsable keyword filters**

The general and design-week directories preserve original source keywords for full-text searching but show a compact selection of recurring topics in their dropdowns. This prevents hundreds of one-off keywords from overwhelming users without hiding those topics from search.

## Design Almanac integration

The revised *Design Almanac 2026* is treated as a source for the Reservoir, not merely as inspiration. Its named organizations, museums and collections, mentorship pathways, cited research sources, global observances, and current non-design-week recurring platforms have been incorporated or explicitly logged for review.

The full import accounting is documented in [`data/almanac-import-manifest.csv`](data/almanac-import-manifest.csv).

The ten-family Design Atlas is preserved separately as structured data in [`data/design-atlas.csv`](data/design-atlas.csv). It retains the Almanac classification and records later reviewed additions with source labels.

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

- [Automated full-link audit](.github/workflows/link-check.yml): on source changes and weekly, checks directory resources, design weeks, events and HTML page links, publishing [`data/link-audit-latest.json`](data/link-audit-latest.json) and a workflow artifact. HTTP status is evidence of URL reachability, **not** evidence that an institution or event is still active.
- [Daily event expiration](.github/workflows/refresh-events.yml): removes records whose end dates have passed from `data/events.csv`.
- Editorial checks of cancellations, replacements, new findings, classification quality, and evidence of continuing operation remain necessary: URL health alone cannot prove an event is happening.
- Preserve original references, publisher credit and licensing constraints; the dataset has no blanket open license.

## Files you may actually care about

- [`data/resources.csv`](data/resources.csv): the active directory in a spreadsheet-like table
- [`research-tools/index.html`](research-tools/index.html): dedicated research-tool directory filtered by scholarly workflow
- [`data/design-atlas.csv`](data/design-atlas.csv): the design-discipline Design Atlas
- [`data/design-weeks.csv`](data/design-weeks.csv): separate Design Weeks dataset
- [`data/events.csv`](data/events.csv): dated global events for the calendar
- [`data/editorial-review.csv`](data/editorial-review.csv): excluded or retired entries and explicit reasons
- [`data/link-audit-latest.json`](data/link-audit-latest.json): most recent automated URL audit, including redirects, access restrictions and failures
- [`data/almanac-import-manifest.csv`](data/almanac-import-manifest.csv): what from the Almanac went where
- [`data/almanac-review.csv`](data/almanac-review.csv): items intentionally held from the Almanac
- [`data/curation-review.csv`](data/curation-review.csv): screened submissions and obsolete or unconfirmed resources, with reasons and next actions
- [`about/index.html`](about/index.html): concise About page
- [`index.html`](index.html): public Design Reservoir webpage
- [`events/index.html`](events/index.html): date-organized Events Calendar

You do not need to edit the code files yourself to maintain the Reservoir.

## Publishing

Public site:

**https://brandiejanow.github.io/design-reservoir/**

## Licensing

No open license has been applied yet. Please do not republish the dataset wholesale without permission while the licensing approach is being finalized.

## Editorial writing style

Do not use em dashes in website copy, research writing, public data labels, metadata, or documentation. Use commas, colons, parentheses, or full stops as appropriate. Preserve the intended meaning and source attribution when revising historical text. Treat this as the standard for future updates.
