# Deferred Items — Phase 06

## Out-of-scope lint (pre-existing, not caused by plan 06-03)

- `lib/expand-availability.ts:2` — `'addDays' is defined but never used` (Wave 2 / plan 06-02 file). Unrelated to plan 06-03 changes; left untouched per SCOPE BOUNDARY. Fix by removing `addDays` from the `date-fns` import in that file.
- `ds-bundle/**` and other repo-wide `yarn lint` errors (~1490) are pre-existing in vendored/bundle code, unrelated to this plan.
