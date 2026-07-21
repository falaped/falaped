---
phase: 06-disponibilidade-calend-rio-do-m-dico
plan: 02
subsystem: availability-data-layer
tags: [supabase, actions, modules, override, idor, zod, batch-save, availability]

# Dependency graph
requires:
  - phase: 06-01 (Wave 1)
    provides: migração híbrida aplicada ao DB vivo (override_type + slot_minutes em availability_exceptions), expandAvailability v2, saveAvailabilitySchema de batch, schema Zod endurecido
provides:
  - Módulos CRUD de override owner-scoped (list/create/delete) com IDOR triple-defense (D-13)
  - types.ts estendido — AvailabilityExceptionRow + override_type/slot_minutes; alias AvailabilityOverrideRow
  - saveAvailabilityAction — batch save que reconcilia {rules, overridesAdd, overridesRemove} num único fluxo (D-17)
  - Contrato de dados (override_type/slot_minutes no select) consumido pelo RSC do Plano 03
affects: [06-03 calendário editável RSC]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Módulo de override evoluído do análogo v1 de exceção: mesma tabela availability_exceptions, mesmo error tag [AVAILABILITY], colunas híbridas no select/insert"
    - "Action de batch save: gate auth+paid -> Zod safeParse do diff -> reconciliação em 3 passos (grade + add + remove) -> revalidatePath"
    - "IDOR triple-defense em todos os módulos: profile_id server-side no create, .eq(profile_id) no read, delete double-scoped (profile_id AND id)"

key-files:
  created:
    - modules/availability/list-availability-overrides.ts
    - modules/availability/create-availability-override.ts
    - modules/availability/delete-availability-override.ts
    - actions/availability/save-availability.ts
  modified:
    - modules/availability/types.ts
    - actions/availability/index.ts
    - actions/index.ts

key-decisions:
  - "D-20: create de override aceita override_type + slot_minutes; aditivo carrega faixa+slot próprio, subtrativo dia-inteiro (faixa null) permanece válido"
  - "D-17: saveAvailabilityAction recebe o diff {rules, overridesAdd, overridesRemove} e reconcilia num único fluxo (grade delete-then-insert -> create cada add -> delete cada remove por id scoped)"
  - "D-13: profile_id stampado server-side no create; delete double-scoped (profile_id + id) para idempotência e anti-IDOR"
  - "Módulos v1 de exceção mantidos (não removidos) — call-sites remanescentes migram no Plano 03; sem órfãos criados por este plano"

patterns-established:
  - "Override CRUD sobre availability_exceptions: select/insert incluem override_type + slot_minutes para a expansão híbrida receber dados reais"
  - "Batch save action: copia o skeleton do save-availability-rules (gate paid verbatim + result union) e estende para reconciliar overrides"

requirements-completed: [AGENDA-01, AGENDA-02, AGENDA-03, AGENDA-05]

coverage:
  - id: D1
    description: "Módulos de override (list/create/delete) escopados por profile_id — IDOR triple-defense (create stampa profile_id server-side, read filtra .eq profile_id, delete double-scoped profile_id+id) (T-06-01, D-13)"
    requirement: "AGENDA-03"
    verification:
      - kind: static_analysis
        ref: "grep: profile_id: profileId no create; .eq(profile_id) no delete + .eq(id) no delete; override_type no select do list"
        status: pass
    human_judgment: false
  - id: D2
    description: "saveAvailabilityAction recebe o diff {rules, overridesAdd, overridesRemove}, gate auth+paid, Zod safeParse no boundary, reconcilia grade+overrides, revalidatePath (D-17, T-06-05, T-06-03)"
    requirement: "AGENDA-05"
    verification:
      - kind: static_analysis
        ref: "grep: profile.status !== paid (==1), safeParse presente, 3 passos de reconciliação (upsert/create/delete), revalidatePath (==2 c/ jsdoc); typecheck clean"
        status: pass
    human_judgment: false
  - id: D3
    description: "Create de override aceita override_type + slot_minutes; subtrativo dia-inteiro válido (D-20)"
    requirement: "AGENDA-01"
    verification:
      - kind: static_analysis
        ref: "CreateAvailabilityOverrideData inclui override_type + slot_minutes; types.ts AvailabilityExceptionRow estendido; typecheck clean"
        status: pass
    human_judgment: false

# Metrics
duration: ~3min
completed: 2026-07-21
status: complete
---

# Phase 6 Plan 02: Camada de dados do modelo híbrido — módulos CRUD de override + batch save — Summary

**Módulos CRUD de override owner-scoped (list/create/delete) evoluídos dos análogos v1 de exceção com IDOR triple-defense (D-13), types.ts estendido com override_type/slot_minutes, e saveAvailabilityAction que reconcilia o diff {rules, overridesAdd, overridesRemove} num único fluxo com gate paid + Zod safeParse + revalidate (D-17).**

## Performance
- **Duration:** ~3 min
- **Completed:** 2026-07-21
- **Tasks:** 2 (ambas auto, sem checkpoints)
- **Files:** 4 criados, 3 modificados

## Accomplishments
- `modules/availability/types.ts` estendido: `AvailabilityExceptionRow` ganha `override_type: "add" | "subtract"` e `slot_minutes: number | null`; alias semântico `AvailabilityOverrideRow` exportado. Tabela mantém o nome v1 `availability_exceptions` (sem rename, per RESEARCH).
- `list-availability-overrides.ts`: `listAvailabilityOverrides(supabase, profileId)` — select inclui `override_type, slot_minutes` (senão a expansão híbrida do Plano 03 recebe undefined), `.eq("profile_id", profileId)` backstop IDOR, `.order("exception_date")`, tag `[AVAILABILITY]`.
- `create-availability-override.ts`: `createAvailabilityOverride(supabase, profileId, input)` com `CreateAvailabilityOverrideData` (override_type + faixa + slot_minutes). `profile_id` stampado server-side no insert (nunca do cliente); `.select(...).single()` com as novas colunas.
- `delete-availability-override.ts`: `deleteAvailabilityOverride(supabase, profileId, id)` — delete double-scoped `.eq("profile_id", profileId).eq("id", id)` (idempotente, anti-IDOR).
- `actions/availability/save-availability.ts`: `saveAvailabilityAction` — copia o skeleton de `save-availability-rules` (gate `getAuthenticatedUser` + `profile.status === "paid"` com string PT-BR verbatim, result union), `saveAvailabilitySchema.safeParse` no boundary, e reconcilia o diff em 3 passos: (1) `upsertAvailabilityRules` (grade delete-then-insert), (2) `createAvailabilityOverride` por item de `overridesAdd`, (3) `deleteAvailabilityOverride` por id de `overridesRemove`. `revalidatePath("/dashboard/agenda")` + `return { ok: true }`.
- Barrels atualizados: `actions/availability/index.ts` (novo export) e `actions/index.ts` (barrel raiz — lista explícita, exige o export para alcance a partir da raiz).

## Task Commits
1. **Task 1: types estendidos + módulos CRUD de override (D-20, IDOR D-13)** - `77e2a01` (feat)
2. **Task 2: saveAvailabilityAction batch reconciliando grade + overrides (D-17)** - `1729003` (feat)

**Plan metadata:** `docs(06-02): complete plan` (este SUMMARY + STATE.md + ROADMAP.md)

## Files Created/Modified
- `modules/availability/types.ts` (MOD) — AvailabilityExceptionRow + override_type/slot_minutes; alias AvailabilityOverrideRow
- `modules/availability/list-availability-overrides.ts` (NEW) — listAvailabilityOverrides
- `modules/availability/create-availability-override.ts` (NEW) — createAvailabilityOverride + CreateAvailabilityOverrideData
- `modules/availability/delete-availability-override.ts` (NEW) — deleteAvailabilityOverride
- `actions/availability/save-availability.ts` (NEW) — saveAvailabilityAction + SaveAvailabilityResult
- `actions/availability/index.ts` (MOD) — export do batch save
- `actions/index.ts` (MOD) — export do batch save no barrel raiz (deviation Rule 3)

## Decisions Made
- **Reconciliação em fluxo único** (D-17): a grade é substituída via delete-then-insert, depois cada override adicionado é criado, depois cada override removido é deletado por id scoped. Aditivos carregam `slot_minutes` próprio; subtrativos deixam `slot_minutes` null.
- **IDOR triple-defense preservado** (D-13, T-06-01): profile_id server-side no create, `.eq(profile_id)` no read, delete double-scoped. RLS (Plano 01) é a segunda camada.
- **Sem remoção de módulos v1**: os módulos de exceção v1 permanecem (call-sites remanescentes migram no Plano 03); este plano não cria órfãos.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adicionado saveAvailabilityAction ao barrel raiz actions/index.ts**
- **Found during:** Task 2
- **Issue:** O barrel raiz `actions/index.ts` usa lista explícita de exports (não `export *`) do sub-barrel de availability. Sem adicionar `saveAvailabilityAction` lá, a action não seria alcançável a partir de `@/actions` (padrão de import do projeto), quebrando o consumo pelo Plano 03.
- **Fix:** Adicionados `saveAvailabilityAction` + `type SaveAvailabilityResult` ao bloco de re-export de `./availability` em `actions/index.ts`.
- **Files modified:** actions/index.ts
- **Verification:** `yarn typecheck` limpo.
- **Committed in:** `1729003` (parte do commit da Task 2)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact:** Mínimo — completa o contrato de barrel exigido pelo success criteria ("barrels updated"), sem scope creep.

## Issues Encountered
None - ambas as tasks executaram conforme o plano. `yarn typecheck` limpo; `yarn test` 542/542 verde.

## User Setup Required
None.

## Next Phase Readiness
- **Plano 03 (calendário editável + RSC):** módulos de override e `saveAvailabilityAction` prontos para consumo. O RSC deve carregar `override_type`/`slot_minutes` reais via `listAvailabilityOverrides` (substituindo a ponte subtrativa do Plano 01) e o editor envia o diff `{rules, overridesAdd, overridesRemove}` ao `saveAvailabilityAction`. Resolver/limpar os call-sites v1 remanescentes de exceção após a troca.

---
*Phase: 06-disponibilidade-calend-rio-do-m-dico*
*Completed: 2026-07-21*

## Self-Check: PASSED
- FOUND: modules/availability/types.ts
- FOUND: modules/availability/list-availability-overrides.ts
- FOUND: modules/availability/create-availability-override.ts
- FOUND: modules/availability/delete-availability-override.ts
- FOUND: actions/availability/save-availability.ts
- FOUND: commit 77e2a01
- FOUND: commit 1729003
- yarn typecheck: clean; yarn test: 542/542 pass
