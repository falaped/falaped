---
phase: 03-curva-de-crescimento
plan: 01
subsystem: ui
tags: [supabase, postgres, rls, zod, react-hook-form, nextjs, pediatric-growth]

# Dependency graph
requires:
  - phase: 01-experiencia-consulta
    provides: "computePediatricAge (motor de idade cronológica/corrigida), lib/parse-anthropometrics-for-bmi (computePediatricBmi), padrão de perfil do paciente (patient-detail-content/view, patient-clinical-overview)"
provides:
  - "Tabela public.patient_measurements (profile_id + patient_id, CHECK ao-menos-uma-medida, índice composto, RLS profile_id-only) aplicada ao banco live"
  - "modules/patient-growth: types, createMeasurement, getMeasurementsByPatient (escopados por profile_id + patient_id)"
  - "actions/patient-growth/createMeasurementAction (gate paid + Zod + conversão kg->g / cm->mm)"
  - "lib/schemas/patient-measurement (createMeasurementSchema: ranges, ao-menos-um, data não-futura)"
  - "computePediatricAge estendido com options.correctedAgeCutoffMonths (default 24m preservado; growth usa 36m)"
  - "Seção de growth no perfil do paciente (form + histórico) montada abaixo de PatientClinicalOverview"
affects: [03-02-grafico-crescimento, 03-03-editar-excluir-medicao, curva-de-crescimento, patient-growth]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Módulo de leitura/escrita escopado por profile_id + patient_id (defense-in-depth sobre RLS)"
    - "Conversão de unidade (kg->g, cm->mm) no boundary do action; módulo persiste inteiros em unidades base"
    - "Extensão do motor de idade via parâmetro opcional (não fork) preservando ordem posicional dos callers"
    - "Data mascarada dd/mm/aaaa via lib/brazilian-date-form (nunca type=date); comparação de data futura por partes (sem new Date(iso) cru)"

key-files:
  created:
    - lib/schemas/patient-measurement.ts
    - modules/patient-growth/types.ts
    - modules/patient-growth/create-measurement.ts
    - modules/patient-growth/get-measurements-by-patient.ts
    - modules/patient-growth/create-measurement.spec.ts
    - actions/patient-growth/create-measurement.ts
    - actions/patient-growth/index.ts
    - supabase/migrations/20260709000000_patient_measurements.sql
    - components/dashboard/patients/growth/growth-section.tsx
    - components/dashboard/patients/growth/measurement-form.tsx
    - components/dashboard/patients/growth/measurement-history-table.tsx
  modified:
    - lib/compute-pediatric-age.ts
    - lib/compute-pediatric-age.spec.ts
    - actions/index.ts
    - components/dashboard/patients/patient-detail-content.tsx
    - components/dashboard/patients/patient-detail-view.tsx

key-decisions:
  - "Conversão de unidade (kg->g, cm->mm) feita no action, mantendo o módulo agnóstico de unidade e persistindo inteiros g/mm."
  - "Motor de idade estendido por parâmetro opcional correctedAgeCutoffMonths; default 24m preservado para não quebrar callers da Phase 1."
  - "IMC derivado no form e na tabela é read-only, calculado só quando peso E estatura presentes (D-11); helper de IMC recebe metros (cm÷100)."
  - "Ações Editar/Remover por linha adiadas para 03-03; tabela documenta o placeholder."

patterns-established:
  - "patient-growth: uma query por arquivo em modules/, action com preamble paid+Zod verbatim, result union"
  - "Ownership spec (mock hand-rolled do SupabaseClient) asserindo .eq(profile_id) E .eq(patient_id)"

requirements-completed: [GROWTH-01, GROWTH-03]

coverage:
  - id: D1
    description: "computePediatricAge aceita { correctedAgeCutoffMonths }; idade corrigida chega a 36m quando solicitado; default (sem options) ainda corta em 24m"
    requirement: GROWTH-03
    verification:
      - kind: unit
        ref: "lib/compute-pediatric-age.spec.ts (30m/35m presentes, 37m ausente, regressão 25m default)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Migration patient_measurements (tabela + CHECK ao-menos-uma-medida + índice + RLS profile_id-only) aplicada ao banco live"
    requirement: GROWTH-01
    verification:
      - kind: manual_procedural
        ref: "Supabase MCP list_tables — public.patient_measurements: 9 colunas, RLS enabled, 4 policies profile_id-only, índice composto, CHECK; migration version 20260709000000"
        status: pass
    human_judgment: false
  - id: D3
    description: "Schema Zod + módulos create/get escopados por profile_id+patient_id + action com gate paid; ownership spec verde"
    requirement: GROWTH-03
    verification:
      - kind: unit
        ref: "modules/patient-growth/create-measurement.spec.ts (getMeasurementsByPatient scopes by BOTH profile_id and patient_id; orders measured_on asc)"
        status: pass
      - kind: integration
        ref: "yarn typecheck"
        status: pass
    human_judgment: false
  - id: D4
    description: "Seção de growth (form + histórico) montada no perfil; medições persistem e aparecem no histórico; datas passadas OK, futuras rejeitadas"
    requirement: GROWTH-01
    verification:
      - kind: integration
        ref: "yarn build (rota /dashboard/patients/[id] compila) + yarn typecheck"
        status: pass
      - kind: manual_procedural
        ref: "UAT: registrar medição no perfil → aparece no histórico → recarregar → persiste"
        status: unknown
    human_judgment: true
    rationale: "O fluxo end-to-end UI→DB (persistência visível + reidratação após reload) precisa de verificação visual/funcional por humano no app rodando."

# Metrics
duration: ~20min (sessão de resume; Tasks 1-2 + checkpoint concluídos em sessão anterior)
completed: 2026-07-09
status: complete
---

# Phase 3 Plan 01: Registrar uma medição (slice vertical) Summary

**Slice vertical UI→action→módulo→DB para registrar medições antropométricas no perfil do paciente: tabela `patient_measurements` com RLS profile_id-only, módulos/action escopados por profile_id+patient_id, schema Zod (ranges + ao-menos-uma + data não-futura), motor de idade estendido a 36m, e a seção de growth (form + histórico) montada abaixo do clinical-overview.**

## Performance

- **Duration:** ~20 min (sessão de resume)
- **Completed:** 2026-07-09T15:43:29Z
- **Tasks:** 4 (Tasks 1-2 + checkpoint em sessão anterior; Tasks 3-4 nesta sessão)
- **Files modified:** 16 (11 criados, 5 modificados)

## Accomplishments
- **Task 1 (sessão anterior):** `computePediatricAge` estendido com `options.correctedAgeCutoffMonths` e a constante `GROWTH_CORRECTED_AGE_CUTOFF_MONTHS = 36`; default 24m preservado (Phase 1 callers intactos).
- **Task 2 + checkpoint (sessão anterior):** migration `patient_measurements` (tabela + CHECK + índice + RLS profile_id-only com 4 policies, cascade no patient_id) escrita e **aplicada ao banco live** — verificada em produção (projeto acstugafrgrqzvtuznxv): 9 colunas, RLS habilitado, 4 policies profile_id-only, índice composto `(profile_id, patient_id, measured_on)`, CHECK ao-menos-uma-medida, migration version 20260709000000.
- **Task 3 (esta sessão):** `createMeasurementSchema` (ranges peso 0,3–180 kg / estatura 20–220 cm / PC 20–70 cm, ao-menos-uma-medida, rejeição de data futura por comparação de partes); módulos `create-measurement`/`get-measurements-by-patient` escopados por `profile_id` + `patient_id`; `createMeasurementAction` com preamble paid + Zod + conversão kg→g / cm→mm; ownership spec verde.
- **Task 4 (esta sessão):** seção de growth (`growth-section` + `measurement-form` + `measurement-history-table`) montada abaixo de `PatientClinicalOverview`; medições carregadas server-side no `Promise.all` de `patient-detail-content`; data mascarada dd/mm/aaaa (sem `type="date"`); IMC derivado read-only; `patient-clinical-overview.tsx` intacto (D-08).

## Task Commits

1. **Task 1: Motor de idade estendido a 36m (TDD)** - `0b22093` (test) → `43d1fb4` (feat) — sessão anterior
2. **Task 2: Migration patient_measurements** - `4fb4e0c` (feat) — sessão anterior
3. **[BLOCKING] Checkpoint: aplicar migration ao banco live** - aplicada e verificada (migration version 20260709000000) — sessão anterior
4. **Task 3: Schema Zod + módulos + action + ownership spec** - `fd9afc9` (feat)
5. **Task 4: Seção de growth no perfil (form + histórico)** - `54b0df5` (feat)

## Files Created/Modified
- `lib/schemas/patient-measurement.ts` (criado) - `createMeasurementSchema`, `CreateMeasurementFormData`, `CreateMeasurementFormInput`; ranges, ao-menos-uma-medida, data não-futura.
- `modules/patient-growth/types.ts` (criado) - `Measurement` (shape DB) + `CreateMeasurementPayload` (unidades base g/mm).
- `modules/patient-growth/create-measurement.ts` (criado) - `createMeasurement` + `MEASUREMENT_SELECT`; insert com profile_id + patient_id.
- `modules/patient-growth/get-measurements-by-patient.ts` (criado) - leitura escopada por profile_id + patient_id, ordenada por measured_on asc.
- `modules/patient-growth/create-measurement.spec.ts` (criado) - ownership spec (mock hand-rolled) asserindo `.eq(profile_id)` E `.eq(patient_id)`.
- `actions/patient-growth/create-measurement.ts` (criado) - `createMeasurementAction`; gate paid + Zod + conversão kg→g / cm→mm + revalidatePath.
- `actions/patient-growth/index.ts` (criado) - barrel.
- `actions/index.ts` (modificado) - re-export de `createMeasurementAction`.
- `supabase/migrations/20260709000000_patient_measurements.sql` (criado, sessão anterior) - tabela + CHECK + índice + RLS profile_id-only.
- `lib/compute-pediatric-age.ts` / `.spec.ts` (modificados, sessão anterior) - `options.correctedAgeCutoffMonths` + `GROWTH_CORRECTED_AGE_CUTOFF_MONTHS`.
- `components/dashboard/patients/growth/measurement-form.tsx` (criado) - rhf + zodResolver + action + data mascarada + IMC derivado.
- `components/dashboard/patients/growth/measurement-history-table.tsx` (criado) - table-in-card, data PT-BR, tabular-nums, em-dash para vazios.
- `components/dashboard/patients/growth/growth-section.tsx` (criado) - h2 "Curva de crescimento" + empty state.
- `components/dashboard/patients/patient-detail-content.tsx` (modificado) - `getMeasurementsByPatient` no `Promise.all`.
- `components/dashboard/patients/patient-detail-view.tsx` (modificado) - `<GrowthSection>` montado abaixo de `<PatientClinicalOverview>`.

## Decisions Made
- Conversão kg→g / cm→mm feita no action, mantendo o módulo agnóstico de unidade (persistindo inteiros g/mm) — conforme recomendado no plano.
- Ações por linha (Editar/Remover) adiadas para 03-03; a tabela deixa um comentário de placeholder em vez de botões desabilitados, mantendo a UI limpa.

## Deviations from Plan

None - plan executed exactly as written. Nenhuma regra de deviation (1-4) foi acionada nas Tasks 3-4.

## Issues Encountered
None. Todos os gates (`npx tsx --test`, `yarn typecheck`, `yarn build`, `yarn test`) passaram na primeira execução após a escrita de cada task.

## User Setup Required
None - nenhuma configuração de serviço externo além da migration já aplicada ao banco live no checkpoint.

## Next Phase Readiness
- Base end-to-end (registrar + persistir + listar) pronta para 03-02 (gráfico de crescimento consome `getMeasurementsByPatient` + o motor de idade estendido a 36m) e 03-03 (editar/excluir medição consome a tabela + o padrão de ownership spec).
- UAT funcional (registrar no app → ver no histórico → reload → persiste) recomendado antes de considerar GROWTH-01 verificado por humano (coverage D4).

## Self-Check: PASSED

Todos os arquivos criados existem no disco e os commits `fd9afc9` (Task 3) e `54b0df5` (Task 4) existem no histórico. Tasks 1-2 (`0b22093`, `43d1fb4`, `4fb4e0c`) e o checkpoint da migration foram confirmados de sessão anterior.

---
*Phase: 03-curva-de-crescimento*
*Completed: 2026-07-09*
