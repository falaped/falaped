---
phase: quick-260701-ctf
plan: 01
subsystem: schemas
tags: [zod, patients, validation, bugfix, tdd]
requires:
  - lib/schemas/patient.ts (optionalGestationalAgeWeeks shared const)
provides:
  - "optionalGestationalAgeWeeks tolerante a string | number | undefined"
affects:
  - createPatientAction (safeparse de re-parse não lança mais)
  - updatePatientAction (safeparse de re-parse não lança mais)
tech-stack:
  added: []
  patterns:
    - "z.union([z.string(), z.number()]) + normalização via String(v) para campos que sofrem double-parse (resolver + action)"
key-files:
  created: []
  modified:
    - lib/schemas/patient.ts
    - lib/schemas/patient.spec.ts
decisions:
  - "Corrigir no schema compartilhado (optionalGestationalAgeWeeks) em vez de em patient-form.tsx ou nos actions — fix único, mínimo, cobre create e update."
  - "Manter saída idêntica (number | undefined), mensagem PT-BR e faixa inclusiva 20-42 — apenas o tipo de entrada foi ampliado."
metrics:
  duration: ~5 min
  completed: 2026-07-09
  tasks: 1
  files: 2
status: complete
---

# Phase quick-260701-ctf Plan 01: Fix gestational age double-parse Summary

Corrigido o erro "Invalid input: expected string, received number" no campo "Idade gestacional ao nascer": `optionalGestationalAgeWeeks` agora aceita `string | number | undefined` (o resolver do formulário já coage o campo para `number`, e os actions fazem `safeParse` uma segunda vez), preservando saída, mensagem e faixa idênticas — com regressão coberta por teste (TDD).

## What Was Built

- **RED:** Dois testes de regressão em `lib/schemas/patient.spec.ts` dentro do describe existente `createPatientSchema gestational_age_weeks`:
  - `gestational_age_weeks: 34` (NÚMERO) → sucesso, saída `34` (simula o re-parse do action). Falhava antes com o erro de double-parse.
  - String `"50"` (fora de faixa) → falha com a mensagem PT-BR `"Informe um valor entre 20 e 42 semanas."`.
- **GREEN:** Reescrita da const compartilhada `optionalGestationalAgeWeeks` em `lib/schemas/patient.ts`:
  - Base trocada de `z.string()` para `z.union([z.string(), z.number()]).optional()`.
  - Primeiro `transform` normaliza `number` → `String(v)` antes do pipeline de trim/vazio existente; `undefined` continua `undefined`.
  - `.refine` (mesma mensagem PT-BR, mesma validação `Number.isInteger(n) && n >= 20 && n <= 42`) e o `transform` final (`Number(v)`) mantidos intactos → saída continua `number | undefined`.
  - JSDoc atualizada para documentar que aceita string ou número (re-parse).
- Os dois pontos de uso (`createPatientSchema` e `updatePatientSchema`) não foram tocados — a const é compartilhada, então corrigi-la corrige ambos. `patient-form.tsx` e os actions não foram modificados.

## Verification

- `yarn typecheck` → passa (`tsc --noEmit`, sem erros).
- `yarn test` → verde: **404 pass / 0 fail** (antes do fix: 403 pass / 1 fail, o novo teste numérico).
- O teste numérico (34) passa e devolve 34; string `"50"` fora de faixa falha com a mensagem PT-BR; nenhum teste pré-existente ("34" string, "", undefined, 19, 43, bounds 20/42, updateSchema) regrediu.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] node_modules ausente no worktree**
- **Found during:** primeira execução de `yarn test` (RED)
- **Issue:** o worktree do agente não tinha `node_modules` (gitignored, existe só no checkout principal), então `tsx` não era encontrado — `yarn test` e `yarn typecheck` não rodavam.
- **Fix:** symlink de `/Users/goker1/falaped/node_modules` para dentro do worktree apenas para rodar as verificações; removido ao final (não commitado, working tree limpo).
- **Files modified:** nenhum (symlink temporário, não versionado)
- **Commit:** n/a

## TDD Gate Compliance

- RED: `39b114b` — `test(quick-260701-ctf-01): add failing regression ...` (teste falhava com o erro de double-parse antes do fix).
- GREEN: `07d33a7` — `fix(quick-260701-ctf-01): tolerate numeric gestational_age_weeks on re-parse`.
- REFACTOR: não necessário (fix mínimo e limpo).

## Self-Check: PASSED

- FOUND: lib/schemas/patient.ts
- FOUND: lib/schemas/patient.spec.ts
- FOUND commit: 39b114b (RED)
- FOUND commit: 07d33a7 (GREEN)
