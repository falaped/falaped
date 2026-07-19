---
phase: 04-documentos-cl-nicos-novos
plan: 05
subsystem: ui
tags: [prescriptions, receituario, blank-mode, next-app-router, server-actions, paid-gate]

# Dependency graph
requires:
  - phase: 04-documentos-cl-nicos-novos
    provides: stack de receitas existente (prescription-wizard, generatePrescriptionAction, payload/PDF/storage), grupo "Serviços" da sidebar com itens das fatias 04-01..04-04
provides:
  - Receituário em branco (DOC-05) como modo vazio (?mode=blank) do fluxo de receita existente
  - Gate `paid` adicionado a generatePrescriptionAction (fecha lacuna pré-existente das receitas)
  - Item "Receituário em branco" no grupo Serviços da sidebar
affects: [phase-05-calendario-de-vacinas, phase-06-carteira-de-vacinacao]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Modo (blankMode flag) de um fluxo existente em vez de novo tipo de documento — reuso total de payload/PDF/storage/escopo profile_id (D-14)"

key-files:
  created: []
  modified:
    - components/dashboard/prescriptions/prescription-wizard.tsx
    - actions/prescriptions/generate-prescription.ts
    - app/dashboard/prescriptions/new/page.tsx
    - app/dashboard/prescriptions/new/prescription-wizard-wrapper.tsx
    - components/app-sidebar.tsx

key-decisions:
  - "DOC-05 é um MODO (blankMode) da receita existente, não um tipo de documento novo — sem migration, sem seed, sem nova action (D-14)"
  - "blankMode também libera o avanço para geração sem paciente associado (canProceed = hasPatient || blankMode), pois receituário em branco tem corpo vazio; modo normal inalterado"
  - "Gate `paid` adicionado a generatePrescriptionAction antes de qualquer escrita/PDF — fecha lacuna pré-existente das receitas e faz DOC-05 satisfazer o critério de sucesso #5 / D-15"

patterns-established:
  - "blankMode prop opcional (default false) — quando true pula guard de min-1-medicamento, muda rótulo do CTA e toast; caminho normal intocado"

requirements-completed: [DOC-05]

coverage:
  - id: D1
    description: "prescription-wizard aceita blankMode: pula guard de min-1-medicamento, inicia vazio, CTA 'Gerar receituário', toast 'Receituário gerado. Download iniciado.'; modo normal inalterado"
    requirement: DOC-05
    verification:
      - kind: manual_procedural
        ref: "04-05-PLAN.md checkpoint:human-verify — abrir ?mode=blank, gerar PDF vazio sem medicamento; abrir modo normal e confirmar que ainda exige medicamento (deferido ao orquestrador / UAT)"
        status: unknown
      - kind: other
        ref: "grep blankMode + 'Gerar receituário' em prescription-wizard.tsx (pass); yarn tsc --noEmit (pass); yarn eslint --max-warnings=0 (pass); yarn build (pass)"
        status: pass
    human_judgment: true
    rationale: "Comportamento visual do PDF em branco (layout de receita, corpo vazio, sem página extra) e a não-regressão da receita normal exigem verificação visual humana — o checkpoint UI-verify foi deferido ao orquestrador (UAT manual)"
  - id: D2
    description: "generatePrescriptionAction aplica o gate `paid` antes de qualquer escrita/PDF"
    requirement: DOC-05
    verification:
      - kind: other
        ref: "grep 'profile.status !== \"paid\"' actions/prescriptions/generate-prescription.ts (pass); yarn tsc --noEmit (pass)"
        status: pass
    human_judgment: false
  - id: D3
    description: "?mode=blank threadado por route/wrapper ao wizard; item 'Receituário em branco' na sidebar (itens 04-01..04-04 preservados)"
    requirement: DOC-05
    verification:
      - kind: other
        ref: "grep 'mode=blank' app-sidebar.tsx + 'blankMode' em page.tsx/wrapper (pass); yarn eslint app/dashboard/prescriptions/new components/app-sidebar.tsx --max-warnings=0 (pass); yarn build (pass)"
        status: pass
    human_judgment: false

# Metrics
duration: 15min
completed: 2026-07-19
status: complete
---

# Phase 4 Plan 5: Receituário em branco (DOC-05) Summary

**Receituário em branco entregue como modo vazio (`?mode=blank`) do fluxo de receita existente — flag `blankMode` que pula o guard de min-1-medicamento, muda CTA/toast, reusa payload/PDF/storage/escopo profile_id; sem migration nova. Bônus: gate `paid` adicionado a generatePrescriptionAction (lacuna pré-existente das receitas fechada).**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-07-19
- **Tasks:** 3 (auto) executadas; checkpoint UI-verify deferido ao orquestrador
- **Files modified:** 5

## Accomplishments
- Prop `blankMode` no `prescription-wizard`: pula o guard de min-1-medicamento, permite avançar/gerar sem paciente (`canProceed = hasPatient || blankMode`), CTA "Gerar receituário", toast "Receituário gerado. Download iniciado." — modo normal 100% inalterado.
- Gate `paid` (`profile.status !== "paid"`) adicionado a `generatePrescriptionAction` antes de qualquer escrita/PDF — fecha lacuna pré-existente das receitas e satisfaz o critério de sucesso #5 / D-15 para DOC-05 (reuso da action).
- `?mode=blank` threadado por `new/page.tsx` → `prescription-wizard-wrapper.tsx` → `PrescriptionWizard`; título/subtítulo da página adaptam-se ao modo em branco.
- Item "Receituário em branco" → `/dashboard/prescriptions/new?mode=blank` anexado ao grupo "Serviços" (append-only; itens 04-01..04-04 preservados).

## Task Commits

1. **Task 1: blankMode no prescription-wizard** — `1cbd7d9` (feat)
2. **Task 1b: gate `paid` em generatePrescriptionAction** — `433f85d` (feat)
3. **Task 2: thread ?mode=blank + item na sidebar** — `39711f6` (feat)

**Plan metadata:** `docs(04-05): complete receituário em branco plan`

## Files Created/Modified
- `components/dashboard/prescriptions/prescription-wizard.tsx` — prop `blankMode`; guard/CTA/toast condicionais; `canProceed` para liberar geração sem paciente em modo branco.
- `actions/prescriptions/generate-prescription.ts` — gate `paid` após resolução do profile, antes de qualquer escrita/PDF; assinatura e escopo profile_id inalterados.
- `app/dashboard/prescriptions/new/page.tsx` — searchParam `mode?`, deriva `blankMode`, passa ao wrapper; título/subtítulo blank-aware.
- `app/dashboard/prescriptions/new/prescription-wizard-wrapper.tsx` — prop `blankMode` repassada ao `PrescriptionWizard`; lógica de key/_t intacta.
- `components/app-sidebar.tsx` — item "Receituário em branco" anexado ao grupo Serviços.

## Decisions Made
- DOC-05 implementado como modo (não tipo novo): reuso total da stack de receitas, sem migration/seed/action nova (D-14).
- `canProceed = hasPatient || blankMode` para que o receituário em branco possa chegar à geração sem paciente associado; a lógica de renderização do bloco de paciente permanece em `hasPatient`, preservando o modo normal.
- Título/subtítulo da rota adaptados ao modo em branco (ajuste opcional previsto no plano) para clareza de UX.

## Deviations from Plan

None - plano executado conforme escrito. O guard `paid` (Task 1b) já estava especificado no plano; a única extensão além dos edits literais foi introduzir `canProceed` (variante mínima de `hasPatient`) para viabilizar a geração em branco sem paciente — coberto pela intenção do plano ("gerar receituário vazio sem exigir medicamento") e sem regressão no caminho normal.

## Issues Encountered
None. `yarn tsc --noEmit`, `yarn eslint --max-warnings=0` (dirs tocadas), `yarn build` e `yarn test` (suite completa: 460 pass / 0 fail) todos verdes.

## User Setup Required
None - nenhuma configuração de serviço externo. Sem migration nova (reusa a stack de receitas já live).

## Next Phase Readiness
- DOC-05 code-complete. Falta apenas o checkpoint `checkpoint:human-verify` (UI-verify do PDF em branco + não-regressão da receita normal), **deferido ao orquestrador para UAT manual**.
- Nenhum blocker introduzido.

## Self-Check: PASSED

Todos os arquivos modificados existem; commits 1cbd7d9, 433f85d, 39711f6 presentes no histórico.

---
*Phase: 04-documentos-cl-nicos-novos*
*Completed: 2026-07-19*
