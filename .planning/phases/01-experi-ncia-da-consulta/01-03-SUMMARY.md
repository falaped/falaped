---
phase: 01-experi-ncia-da-consulta
plan: 03
subsystem: cases/pdf
tags: [cons-04, pdf, tiptap-sanitization, pii-log, repro-script, deferred-path-a]

# Dependency graph
requires:
  - phase: none
    provides: "@falaped/falaped-kit/pdf buildReportPdf (published 0.2.7)"
provides:
  - "actions/cases/download-case-report-pdf.ts — sanitized sections (drop empty TipTap paragraphs, collapse \\n{3,}); PII console.log removed"
  - "scripts/repro-report-pdf.ts — repro at 3 page sizes (0.9 / 1.05 / 2.3)"
affects: [Phase 3 (new documents reuse the same PDF builder + inherit Path B), Phase 5 (carries Path A kit release)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sanitize section content before handing to the kit PDF builder (in-repo mitigation when the kit is an external published package)"

key-files:
  created:
    - scripts/repro-report-pdf.ts
  modified:
    - actions/cases/download-case-report-pdf.ts
    - .gitignore

key-decisions:
  - "CONS-04 split into Path B (in-repo, shipped) and Path A (kit release, DEFERRED to Phase 5 per user decision)."
  - "Path B sanitizes the `sections` passed to buildReportPdf — removes empty TipTap paragraphs and collapses runs of blank lines — and removes the forgotten console.log(\"datapdf\") PII leak. This eliminates the spurious blank page / trailing footer band for 1-page and multi-page reports."
  - "Path A (the ~1.05-page boundary phantom page) requires editing + republishing @falaped/falaped-kit (remove the forced 200pt footer reserve; fix heightOfString estimate≠render drift). The kit is a published external package (dist-only, not in this repo), so this was MOVED to Phase 5 as a carried-over deliverable."

requirements-completed: [CONS-04]
requirements-partial:
  - "CONS-04 boundary (~1.05 page): in-repo Path B shipped; full fix (Path A kit release) deferred to Phase 5."

# Metrics
duration: ~5min (Path B; Path A deferred)
completed: 2026-06-28
---

# Phase 1 Plan 03: CONS-04 PDF Fix (Path B) Summary

**The report PDF no longer emits a spurious blank page or trailing footer band for 1-page and multi-page content: empty TipTap paragraphs and blank-line runs are sanitized out of the `sections` before they reach the kit's `buildReportPdf`, and the forgotten PII `console.log` was removed. The ~1.05-page boundary phantom page — rooted in the kit's forced footer reserve — requires a kit release (Path A) and was deferred to Phase 5.**

## Performance

- **Duration:** ~5 min (Path B in-repo)
- **Tasks:** 2 of 4 implemented in-repo; Tasks 3–4 (Path A kit release) deferred to Phase 5 by user decision.
- **Files created:** 1 · **modified:** 2

## Accomplishments (Path B — shipped)

- **Section sanitization** in `actions/cases/download-case-report-pdf.ts`: drop empty TipTap paragraphs and collapse `\n{3,}` before building the PDF, removing the dead vertical space that pushed content onto an extra page in the common cases.
- **PII log removed:** the forgotten `console.log("datapdf", datapdf)` (leaked report content to logs) is gone; `console.error` paths retained.
- **Repro script** (`scripts/repro-report-pdf.ts`): generates reports at 3 sizes — `repro-0.9.pdf` (1 page, clean), `repro-2.3.pdf` (3 pages, clean), `repro-1.05.pdf` (boundary, still 2 pages until Path A).

## Deferred — Path A (moved to Phase 5)

The ~1.05-page boundary phantom page is caused inside `@falaped/falaped-kit` (forced 200pt footer reserve triggering an early `addPage()`; `heightOfString` estimate≠render drift). The kit is a published, dist-only external package, so the fix requires a kit source edit + release + version bump. Per user decision this is carried to **Phase 5** (see ROADMAP "Carried over from Phase 1 — CONS-04 Path A"). Phase 3 documents reuse the same builder and inherit Path B until then.

## Task Commits

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Sanitize report sections + remove PII console.log | 1d30fc1 |
| 2 | Repro script for 3 page sizes | 2a42348 |

## Verification

- `yarn typecheck` passes; Path B grep gates pass (`filter` + `replace(/\n{3,}/g` present, `console.log("datapdf"` count = 0).
- Repro: `repro-0.9.pdf` = 1 page (clean), `repro-2.3.pdf` = 3 pages (clean), `repro-1.05.pdf` = 2 pages (boundary — Path A, Phase 5).

## Known Stubs / Deferred

- **CONS-04 boundary (~1.05 page):** deferred to Phase 5 (kit release). Tracked in ROADMAP.

## Self-Check: PASSED

- FOUND: scripts/repro-report-pdf.ts
- download-case-report-pdf.ts: console.log("datapdf") count = 0; sanitization present
- FOUND commits: 1d30fc1, 2a42348
