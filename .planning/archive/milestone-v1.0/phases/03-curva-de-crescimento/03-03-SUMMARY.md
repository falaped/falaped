---
phase: 03-curva-de-crescimento
plan: 03
subsystem: patient-growth
tags: [crud, idor, ownership, server-actions, zod, alert-dialog, nextjs, react19, pediatric-growth]

# Dependency graph
requires:
  - phase: 03-curva-de-crescimento (plan 01)
    provides: "patient_measurements table + RLS, createMeasurement/getMeasurementsByPatient, MEASUREMENT_SELECT, Measurement type, createMeasurementSchema, measurement-form + measurement-history-table (placeholder de ações)"
  - phase: 03-curva-de-crescimento (plan 02)
    provides: "growth-chart + growth-section (Tabs) que reidratam após mutações via router.refresh()"
  - phase: 02 (patients)
    provides: "delete-patient/update-patient (analog dual-scope + ownership spec), remove-photo AlertDialog destrutivo (analog do dialog)"
provides:
  - "modules/patient-growth/update-measurement.ts (updateMeasurement — escopo id+profile_id+patient_id, só campos providos + updated_at)"
  - "modules/patient-growth/delete-measurement.ts (deleteMeasurement — escopo id+profile_id+patient_id, sem cascade)"
  - "ownership specs (9 asserções dos três .eq de escopo — guarda contra CONCERNS Pitfall 5 / IDOR)"
  - "actions/patient-growth/{update,delete}-measurement.ts (gate paid + Zod safeParse + revalidatePath + result unions)"
  - "updateMeasurementSchema + UpdateMeasurementFormData/Input em lib/schemas/patient-measurement.ts"
  - "measurement-form em modo edit (pré-popula g->kg / mm->cm, submete via updateMeasurementAction)"
  - "components/dashboard/patients/growth/remove-measurement-dialog.tsx (AlertDialog destrutivo → deleteMeasurementAction)"
  - "measurement-history-table com Editar/Remover por linha (dropdown), form de edição inline"
affects: [curva-de-crescimento, patient-growth]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mutação escopada por id+profile_id+patient_id (triple .eq) — nunca .delete().eq('id') sozinho (D-14 / CONCERNS Pitfall 5)"
    - "Ownership spec por mutação: mock SupabaseClient que grava os .eq do update/delete e assere os três escopos + 'só campos providos'"
    - "Edit reusa o mesmo componente de form via prop mode=create|edit + open/onOpenChange controlado (não reimplementa)"
    - "Schema de update = shape do create + id uuid, mantendo ranges + rejeição de data futura + at-least-one no estado final"
    - "AlertDialog destrutivo controlado (open/onOpenChange) espelhando o padrão remove-photo da Phase 2"

key-files:
  created:
    - modules/patient-growth/update-measurement.ts
    - modules/patient-growth/delete-measurement.ts
    - modules/patient-growth/update-measurement.spec.ts
    - modules/patient-growth/delete-measurement.spec.ts
    - actions/patient-growth/update-measurement.ts
    - actions/patient-growth/delete-measurement.ts
    - components/dashboard/patients/growth/remove-measurement-dialog.tsx
  modified:
    - lib/schemas/patient-measurement.ts
    - modules/patient-growth/types.ts
    - actions/patient-growth/index.ts
    - actions/index.ts
    - components/dashboard/patients/growth/measurement-form.tsx
    - components/dashboard/patients/growth/measurement-history-table.tsx
    - components/dashboard/patients/growth/growth-section.tsx

key-decisions:
  - "delete valida { id, patientId } via schema Zod inline no action (uuids); update usa updateMeasurementSchema."
  - "measurement-form ganhou open/onOpenChange controlado: modo create mantém open interno + CTA 'Registrar medição'; modo edit é controlado pelo histórico e nunca renderiza CTA própria."
  - "measurement-history-table virou 'use client' (precisa de estado editingId/removing por linha); form de edição expande como linha colSpan={6} sob a linha editada; remove abre AlertDialog único."
  - "delete-measurement sem cascade/storage side-effects — medição não tem linhas derivadas nem arquivos (contraste com delete-patient)."

patterns-established:
  - "Toda nova mutação em patient_measurements deve carregar os três .eq de escopo + ownership spec (segue create/get da 03-01 e delete/update-patient da Phase 2)."

requirements-completed: [GROWTH-01, GROWTH-03]

coverage:
  - id: T-03-09
    description: "IDOR — update/delete por UUID alheio; escopo id+profile_id+patient_id em toda mutação (nunca só id)"
    requirement: GROWTH-03
    verification:
      - kind: unit
        ref: "modules/patient-growth/{delete,update}-measurement.spec.ts (9 asserções: id, profile_id, patient_id nos .eq de delete E update)"
        status: pass
      - kind: manual
        ref: "checkpoint end-to-end: médico A tenta mutar id do médico B → falha / não afeta a linha"
        status: unknown
    human_judgment: true
    rationale: "Isolamento entre tenants precisa de verificação no app rodando (checkpoint diferido ao orquestrador)."
  - id: T-03-10
    description: "update/delete action sem gate — preamble getAuthenticatedUser + profile.status !== 'paid' verbatim"
    requirement: GROWTH-03
    verification:
      - kind: integration
        ref: "grep 'profile.status !== \"paid\"' em actions/patient-growth/{update,delete}-measurement.ts (presente em ambos)"
        status: pass
    human_judgment: false
  - id: T-03-11
    description: "edição com valores absurdos / data futura rejeitada — updateMeasurementSchema reusa ranges + future-date + at-least-one"
    requirement: GROWTH-01
    verification:
      - kind: integration
        ref: "yarn typecheck (updateMeasurementSchema deriva de measuredOnField + optionalAnthropometric compartilhados)"
        status: pass
    human_judgment: false
  - id: T-03-12
    description: "exclusão acidental — AlertDialog destrutivo com copy 'Esta ação não pode ser desfeita'"
    requirement: GROWTH-01
    verification:
      - kind: integration
        ref: "grep 'Remover medição?' + 'não pode ser desfeita' em remove-measurement-dialog.tsx; yarn build verde"
        status: pass
    human_judgment: false
  - id: GROWTH-01-EDIT
    description: "pediatra edita medição (data/valores) e persiste/reflete no histórico e curva"
    requirement: GROWTH-01
    verification:
      - kind: integration
        ref: "measurement-form mode=edit → updateMeasurementAction; yarn build verde"
        status: pass
      - kind: manual
        ref: "checkpoint: editar peso → histórico e curva refletem"
        status: unknown
    human_judgment: true
    rationale: "Render/reidratação do chart após mutação precisa do app rodando."

# Metrics
duration: ~6min
completed: 2026-07-09
status: complete
---

# Phase 3 Plan 03: Editar / excluir medição (slice vertical) Summary

**Sobre o registro (03-01) e a curva (03-02), o pediatra edita e remove medições do histórico com todas as mutações escopadas por `id` + `profile_id` + `patient_id` atrás do gate `paid`, guardadas por ownership specs contra o bug IDOR documentado (CONCERNS Pitfall 5).**

## Performance

- **Duration:** ~6 min
- **Completed:** 2026-07-09T17:12:20Z
- **Tasks:** 2 executadas (Task 1 + Task 2). O 3º item do plano é um `checkpoint:human-verify` end-to-end **diferido ao orquestrador** (verificação manual do CRUD + isolamento entre médicos com o usuário).
- **Files:** 14 (7 criados, 7 modificados)

## Accomplishments

- **Task 1 — Módulos + actions escopados + ownership specs + schema (`0188b0c`):**
  - `updateMeasurementSchema` em `lib/schemas/patient-measurement.ts` = shape do create + `id: z.string().uuid()`, reusando `measuredOnField` (rejeita data futura) e `optionalAnthropometric` (ranges), com o refine "ao menos uma medida" no estado final. Exporta `UpdateMeasurementFormData`/`Input`.
  - `modules/patient-growth/update-measurement.ts` — `updateMeasurement(client, id, profileId, patientId, updates)`: monta `updates` só com campos providos + `updated_at`, `.update(...).eq("id").eq("profile_id").eq("patient_id").select(MEASUREMENT_SELECT).single()`. throw `[GROWTH]`.
  - `modules/patient-growth/delete-measurement.ts` — `deleteMeasurement(client, id, profileId, patientId)`: `.delete().eq("id").eq("profile_id").eq("patient_id")`. Sem cascade/storage. **Nunca** `.delete().eq("id")` sozinho.
  - Ownership specs (mock SupabaseClient espelhando `delete-patient.spec.ts`): asseveram que **id, profile_id E patient_id** aparecem nos `.eq` de delete E de update; o update-spec também prova que só campos providos são escritos e que `updated_at` sempre é setado.
  - `actions/patient-growth/{update,delete}-measurement.ts` com o preamble verbatim (`getAuthenticatedUser` → `profile.status !== "paid"` → Zod `safeParse`), delegam com `profile.id` + `patientId`, `revalidatePath(\`/dashboard/patients/${patientId}\`)`, result unions + try/catch. Barris atualizados (`actions/patient-growth/index.ts` + `actions/index.ts`).
- **Task 2 — Modo edit do form + AlertDialog de remoção + wiring no histórico (`4aed14a`):**
  - `measurement-form.tsx` ganhou `mode: "create" | "edit"` + `measurement?` (+ `open`/`onOpenChange` controlado). Em edit pré-popula convertendo g→kg / mm→cm e a data ISO→dd/mm/aaaa, submete via `updateMeasurementAction` com o `id` da linha; create mantém `createMeasurementAction`. Sucesso = toast + reset + fechar + `router.refresh()`.
  - `remove-measurement-dialog.tsx` — `AlertDialog` destrutivo (título `Remover medição?`, corpo `A medição de {data} será removida do histórico e da curva. Esta ação não pode ser desfeita.`, `Cancelar`/`Remover` destrutivo). Confirma → `deleteMeasurementAction({ id, patientId })`; toast de erro `Não foi possível remover a medição.` no fail.
  - `measurement-history-table.tsx` virou `"use client"`, ativou `Editar`/`Remover` por linha (dropdown), o form de edição expande inline (`colSpan={6}`) e a remoção abre o dialog. Copy PT-BR conforme UI-SPEC. `growth-section.tsx` passa `patientId` ao histórico.

## Task Commits

1. **Task 1: módulos/actions escopados + ownership specs + schema de update** — `0188b0c`
2. **Task 2: modo edit do form + AlertDialog de remoção + row actions** — `4aed14a`

## Ownership / IDOR guard (o núcleo do plano)

`delete-measurement.ts` e `update-measurement.ts` escopam **sempre** pelos três `.eq`:

```
.eq("id", id).eq("profile_id", profileId).eq("patient_id", patientId)
```

Isto é a defesa direta contra o bug documentado em CONCERNS (prescription/certificate deletes com `.delete().eq("id", ...)` sem owner filter). As specs falham se qualquer um dos três escopos sumir:

- `delete-measurement.spec.ts` → 4 testes (id / profile_id / patient_id isolados + "os três juntos")
- `update-measurement.spec.ts` → 5 testes (os três escopos + "só campos providos, updated_at sempre" — partial edit não sobrescreve length/PC)

## Verification

- `npx tsx --test modules/patient-growth/delete-measurement.spec.ts modules/patient-growth/update-measurement.spec.ts` → **9 pass, 0 fail** (todos os três `.eq` de escopo verificados em delete e update)
- Greps de aceitação: `.eq("profile_id"` = 1 e `.eq("patient_id"` = 1 em `delete-measurement.ts`; `profile.status !== "paid"` presente em ambos os actions; `Remover medição?` presente no dialog; `updateMeasurementAction` no form; `AlertDialog` + `deleteMeasurementAction` no dialog; `Editar`/`Remover` no histórico
- `yarn typecheck` → verde
- `yarn build` → verde (rota `/dashboard/patients/[id]` compila com a tabela client + form edit + dialog)
- `yarn test` (suíte completa) → **439 pass, 0 fail** (430 anteriores + 9 novas ownership specs)
- `patient-clinical-overview.tsx` intocado (D-08) — confirmado via `git status`

## Files Created/Modified

Criados: `modules/patient-growth/update-measurement.ts` (+ `.spec.ts`), `modules/patient-growth/delete-measurement.ts` (+ `.spec.ts`), `actions/patient-growth/update-measurement.ts`, `actions/patient-growth/delete-measurement.ts`, `components/dashboard/patients/growth/remove-measurement-dialog.tsx`.
Modificados: `lib/schemas/patient-measurement.ts` (updateMeasurementSchema), `modules/patient-growth/types.ts` (UpdateMeasurementPayload), `actions/patient-growth/index.ts` + `actions/index.ts` (barris), `components/dashboard/patients/growth/measurement-form.tsx` (modo edit), `measurement-history-table.tsx` (client + row actions), `growth-section.tsx` (patientId).

## Decisions Made

- **delete valida `{ id, patientId }` com schema Zod inline** no próprio action (uuids), sem um arquivo de schema dedicado — a superfície é mínima e o schema de update já cobre o caso complexo.
- **measurement-form controlado no modo edit**: o histórico controla `open`/`onOpenChange`; o form nunca renderiza a CTA "Registrar medição" quando em edit, evitando duas entradas de UI.
- **history-table virou client component** por precisar de estado por linha (editingId/removing); o form de edição expande inline como uma linha extra (`colSpan={6}`) em vez de um modal, mantendo o contexto da tabela.

## Deviations from Plan

- **history-table de server → client**: a 03-01 deixou o histórico como server component com placeholder de ações; ativá-las (Editar/Remover interativos) exige `"use client"` e um novo prop `patientId` (repassado em `growth-section.tsx`). É a mudança mínima necessária ao wiring exigido pela Task 2; não altera contrato de dados.
- **`open`/`onOpenChange` adicionados ao measurement-form**: necessário para o histórico controlar a abertura do form de edição por linha (o modo create mantém o comportamento uncontrolled original). Sem impacto no fluxo de create.
- Nenhuma das regras de deviation (1-4) foi acionada; nenhum item deferido/fora de escopo.

## Issues Encountered

- Nenhum. Fragmento `<>` com `key` no `.map` foi trocado por `Fragment` importado (chave por medição) para satisfazer o typecheck/React; fora isso todos os gates passaram de primeira.

## User Setup Required

None — sem dependências novas nem configuração de serviço externo.

## Deferred: checkpoint end-to-end

O 3º item do plano (`checkpoint:human-verify`, gate `blocking`) **não foi executado** por decisão do orquestrador: é a verificação manual end-to-end do CRUD (registrar/editar/remover refletindo no histórico e na curva) + o isolamento entre médicos (IDOR) + o gate `paid`. O orquestrador conduz essa verificação com o usuário. As ownership specs (9/9 verdes) já cobrem o escopo id+profile_id+patient_id no nível de unidade.

## Self-Check: PASSED

Todos os arquivos criados existem no disco; commits `0188b0c` e `4aed14a` no histórico; 9 ownership specs verdes; suíte 439/439 verde; typecheck + build verdes; patient-clinical-overview intocado.

---
*Phase: 03-curva-de-crescimento*
*Completed: 2026-07-09*
