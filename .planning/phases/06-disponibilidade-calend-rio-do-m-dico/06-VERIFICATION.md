---
phase: 06-disponibilidade-calend-rio-do-m-dico
verified: 2026-07-22T00:00:00Z
status: passed
score: 13/13 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: none
---

# Phase 6: Disponibilidade & Calendário do Médico (v2 redesign) — Verification Report

**Phase Goal:** O médico gerencia sua disponibilidade num calendário único editável (dia/semana/mês, America/Sao_Paulo): pinta disponibilidade (verde) e folgas, salva em lote com confirmação de descarte — sobre modelo híbrido (template recorrente + overrides por data aditivos/subtrativos); slots expandidos na leitura por função pura; sem nova superfície externa.
**Verified:** 2026-07-22T00:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Merged from ROADMAP SC-1..5 + the three plans' `must_haves.truths`. The user-approved deviation (D-15/D-16 toggle+click/drag → context-menu model) and the two fixed BLOCKERs (CR-01/CR-02) are folded in below.

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Disponibilidade recorrente por dia+faixa, repete semana a semana, sem row por slot (SC-1, AGENDA-01) | ✓ VERIFIED | `availability_rules` template preservado (D-19); `expandAvailability` itera weekday e emite slots na leitura (lib/expand-availability.ts:211-218) — nenhuma row-por-slot persistida. RPC substitui a grade completa (save_availability_rpc.sql:56-69). |
| 2 | Duração de slot por faixa; slots expandidos na leitura por função pura testável (SC-2, AGENDA-02) | ✓ VERIFIED | `slotMinutes` por banda (lib/expand-availability.ts:24, 216); iteração por slot-duração (231-234); D-10 sobra descartada. Suite `.spec` cobre múltiplas durações — 542 testes verdes. Fn pura: sem `new Date()`/`process.env`. |
| 3 | Folga por data (dia inteiro ou parcial) remove horários; aditivo pontual por data soma fora do template (SC-3, AGENDA-03/AGENDA-05) | ✓ VERIFIED | Precedência D-21: template→aditivos(union+dedupe)→subtrativos (folga vence) em expand-availability.ts:197-251. Casos spec "aditivo básico", "folga vence", "subtrativo dia-inteiro" presentes (spec:320,360,376). Migração adiciona `override_type add/subtract` + CHECK aditivo-precisa-faixa (hybrid.sql:31-75). |
| 4 | Dia/Semana/Mês corretos nas viradas (meio-abertos, semana na segunda), fuso America/Sao_Paulo, sem slot duplicado/sumido; mês=indicador; edição em dia/semana (SC-4, AGENDA-04) | ✓ VERIFIED | Half-open `slotStart < to` (expand:247), `< end` nunca `<=` (D-11); iteração zonada `TZDate(day,tz).getDay()` (193); `wallClock` DST-safe (86-95). Mês read-only (calendar-month-indicator.tsx: 0 paint handlers, dot+count via byDay). **CR-01 FIX**: client `weekdayOf` ancora `TZDate(y,m-1,d,tz)` (calendar-editor.tsx:205-208) — casa com o servidor. |
| 5 | Pintura por clique/arraste/dia-inteiro, seleção de modo (disponibilidade/folga), salvar em lote com confirmação antes de descartar (SC-5, D-16/D-17) | ✓ VERIFIED (human-approved for visual) | Deviação aprovada: context-menu (esq=disponibilidade c/ escopo recorrente vs só-nesta-data, dir=folga) substitui toggle+click/drag puro. Drag via Pointer Events (`setPointerCapture`, `touchAction:none` grid:157,235). Batch save + `beforeunload` guard (editor:285-293) + confirm. Visual checkpoint APROVADO pelo usuário. |
| 6 | expandAvailability precedência híbrida + DST-safe preserva minutos locais (D-21/WR-01) | ✓ VERIFIED | wallClock derives h/m e usa setHours/Minutes no `{in: tz}` — nunca `addMinutes` absoluto. Spec caso "WR-01 DST spring-forward America/New_York 2026-03-08" (spec:294). `grep addMinutes(dayStart` vazio. |
| 7 | Folgas v1 preservadas com override_type='subtract' (D-22) | ✓ VERIFIED | ALTER-only + backfill (hybrid.sql:31-39); `grep drop/create table availability_exceptions` vazio. 06-01 checkpoint: antes==depois==2, subtrativas==2 (aplicado ao DB vivo, advisors limpos). |
| 8 | Schema rejeita ISO ambígua (WR-02) + minutos >1440 (WR-03) + exige slot>0 aditivo | ✓ VERIFIED | `isValidIsoDate` rebuild-and-compare (schemas:21-34, sem `Date.parse`); `.max(1440)` em rule+override (48,53,89,95); refines aditivo-exige-faixa+slot (124-142). |
| 9 | Módulos override list/create/delete owner-scoped (IDOR triple-defense, D-13) | ✓ VERIFIED | list `.eq(profile_id)` (list:23); create stampa `profile_id: profileId` server-side (create:33); delete double-scoped `.eq(profile_id).eq(id)` (delete:22-23). RPC re-verifica dono via `auth.uid()`. |
| 10 | saveAvailabilityAction: diff {rules,overridesAdd,overridesRemove}, gate paid+Zod, reconcilia atomicamente (D-17, CR-02) | ✓ VERIFIED | **CR-02 FIX**: gate paid (save-availability.ts:41), safeParse (47), `supabase.rpc("save_availability",...)` (54) — corpo plpgsql implicitamente atômico, revalidatePath (70). RPC SECURITY INVOKER + authenticated-only + owner-check (rpc.sql:39,44-52,100-101). |
| 11 | RSC carrega rules+overrides scoped, expande semana, monta CalendarEditor, paid gate (D-14) | ✓ VERIFIED | page.tsx: paid gate `status !== "paid"` redirect (36), `listAvailabilityOverrides(supabase, profile.id)` (40), semana meio-aberta segunda, `<CalendarEditor>` (109), overrides mapeados (58). |
| 12 | Re-expansão client-side na navegação sem slot duplicado/sumido (D-14) | ✓ VERIFIED | `expandAvailability` importado+chamado no client (editor:29,664); mesma fn pura serializável usada em RSC e browser. |
| 13 | Mês = indicador (ponto+contagem), sem pintura (D-18) | ✓ VERIFIED | calendar-month-indicator.tsx: byDay dot+`{freeSlotCount} livres` (79-107); 0 paint/pointer handlers. |

**Score:** 13/13 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `supabase/migrations/20260722000000_availability_overrides_hybrid.sql` | ALTER+backfill híbrido | ✓ VERIFIED | ALTER-only, override_type+slot_minutes, 3 CHECKs, backfill. Applied+verified (06-01 checkpoint). |
| `supabase/migrations/20260722100000_save_availability_rpc.sql` | RPC transacional | ✓ VERIFIED | SECURITY INVOKER, search_path='', owner-check, revoke public/grant authenticated. Applied+verified (context). |
| `lib/expand-availability.ts` | fn pura híbrida DST-safe | ✓ VERIFIED | wallClock, precedência D-21, half-open, pura. |
| `lib/expand-availability.spec.ts` | 13 migrados + 7 híbridos/DST | ✓ VERIFIED | 542 tests pass; DST/additive/subtract-wins/dedupe cases present. |
| `lib/schemas/availability.ts` | override schema WR-02/WR-03 + batch | ✓ VERIFIED | strict ISO, max 1440, enum, saveAvailabilitySchema. |
| `modules/availability/list|create|delete-availability-override.ts` | CRUD owner-scoped | ✓ VERIFIED | IDOR triple-defense present. |
| `modules/availability/types.ts` | Row estendida + alias | ✓ VERIFIED | override_type, slot_minutes, AvailabilityOverrideRow alias. |
| `actions/availability/save-availability.ts` + barrel | batch action via RPC | ✓ VERIFIED | RPC call, gate, Zod, revalidate; exported in index.ts. |
| `app/dashboard/agenda/page.tsx` | RSC carga+expand+editor | ✓ VERIFIED | paid gate, overrides, CalendarEditor. |
| `components/dashboard/agenda/calendar-editor.tsx` | superfície editável draft/dirty/guard/batch | ✓ VERIFIED | weekdayOf CR-01 fixed, beforeunload, computeDiff, saveAvailabilityAction. |
| `.../calendar-day-week-grid.tsx` | grid + pintura pointer | ✓ VERIFIED | setPointerCapture, touchAction none, 06-18 window. |
| `.../availability-cell-menu.tsx` | menu contexto esq/dir | ✓ VERIFIED | Disponibilidade/Folga, escopo recorrente vs só-nesta-data. |
| `.../calendar-month-indicator.tsx` | mês indicador | ✓ VERIFIED | dot+count, no paint. |
| `.../availability-action-panel.tsx` | (planned) | ⚠️ NOT CREATED (approved) | Substituído por toolbar slim + context-menu no checkpoint (user-approved deviation). Not a gap. |

### Key Link Verification

| From | To | Via | Status |
| --- | --- | --- | --- |
| calendar-editor | saveAvailabilityAction | computeDiff → {rules,overridesAdd,overridesRemove} → action | ✓ WIRED |
| saveAvailabilityAction | DB | supabase.rpc("save_availability",...) atomic | ✓ WIRED |
| page.tsx + editor | expandAvailability | pure fn RSC + client re-expand | ✓ WIRED |
| listAvailabilityOverrides.select | RSC | override_type, slot_minutes in select | ✓ WIRED |
| create/delete override | DB | profile_id stamped + double-scoped | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| CalendarEditor | rules/overrides draft | RSC props (listAvailabilityOverrides + listAvailabilityRules, scoped) → save via RPC | ✓ Yes | ✓ FLOWING |
| calendar-month-indicator | byDay | expandAvailability(byDay) from RSC/client | ✓ Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Full pure-fn suite (hybrid/DST/precedence) | `yarn test` | 542 pass, 0 fail | ✓ PASS |
| Type integrity across layers | `yarn typecheck` | clean | ✓ PASS |
| WR-01 removed | `grep addMinutes(dayStart` | empty | ✓ PASS |
| DST case present | `grep America/New_York spec` | 3 matches | ✓ PASS |
| UI runtime (paint/drag/save/toggle) | `yarn dev` manual | — | ? SKIP (human-approved during execution) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| AGENDA-01 | 01,02,03 | Disponibilidade recorrente por dia+faixa | ✓ SATISFIED | Truth 1; availability_rules + expand template |
| AGENDA-02 | 01,02,03 | Duração de slot; expansão na leitura | ✓ SATISFIED | Truth 2; slotMinutes por faixa, fn pura |
| AGENDA-03 | 01,02,03 | Folga por data remove horários | ✓ SATISFIED | Truth 3; override subtract, folga vence |
| AGENDA-04 | 01,03 | Dia/semana/mês corretos, fuso | ✓ SATISFIED | Truth 4; half-open, TZ, CR-01 fix, mês indicador |
| AGENDA-05 | 01,02,03 | Aditivo pontual soma fora do template | ✓ SATISFIED | Truth 3; override add, spec case, RPC insert |

All 5 declared IDs accounted for. No orphaned requirements (REQUIREMENTS.md maps exactly AGENDA-01..05 to Phase 6). Note: REQUIREMENTS.md traceability table still shows AGENDA-01..04 as "In Progress (reopened for v2 redesign)" — this is a documentation-lag informational item, not a goal gap; the requirements are functionally satisfied in code.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| — | — | No TBD/FIXME/XXX debt markers | ℹ️ Info | Clean |
| components/ui/context-menu.tsx | whole file | Unused primitive (feature uses Popover) | ℹ️ Info | IN-03; dead code, no functional impact |
| calendar-editor.tsx | 549 (WR-01 review) | Custom per-band duration lost on band merge | ⚠️ Warning | Falls back to default 30min silently; edge case, not blocking goal |
| calendar-editor.tsx | 566-593 (WR-02 review) | Full-day folga round-trips as [0,1440) partial not canonical null | ⚠️ Warning | Day still fully blocked functionally; DB representation drift, latent |

No blocker anti-patterns. The two ⚠️ warnings are the code-review's WR-01/WR-02 (both warning-severity in 06-REVIEW.md, not the fixed CR-01/CR-02 blockers) — they degrade an edge case but do not defeat any success criterion.

### Gaps Summary

None blocking. Both code-review BLOCKERs (CR-01 client weekday TZ, CR-02 non-transactional save) are FIXED and verified in code (commits c6303fa, 3f12d6f): `weekdayOf` anchors via `TZDate(y,m-1,d,tz)` matching the server, and `saveAvailabilityAction` calls the atomic `save_availability` RPC (SECURITY INVOKER, authenticated-only, owner-checked). Both migrations (hybrid ALTER+backfill and the RPC) are applied and verified against the live DB. The v2 goal is achieved: single editable calendar, hybrid model (recurring template + additive/subtractive per-date overrides), pure expansion correct across day/week/month boundaries and America/Sao_Paulo timezone, batch save with discard guard. The user-approved deviation (context-menu interaction replacing the D-15/D-16 toggle) fully covers SC-5. The visual/interaction surface (SC-5) was approved by the user during execution.

Residual non-blocking items (deferred to normal follow-up, not gaps): review warnings WR-01 (per-band duration lost on merge), WR-02 (full-day folga representation drift), WR-05/WR-06 (beforeunload/overridesRemove — coupled to WR-02 and the RPC now sidesteps the transactional risk), and unused `context-menu.tsx` primitive (IN-03).

---

_Verified: 2026-07-22T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
