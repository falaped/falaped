---
phase: 03-curva-de-crescimento
verified: 2026-07-09T00:00:00Z
status: human_needed
score: 3/3 requirements verified (15/15 must-have truths)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Confirmar que a migration 20260709000000_patient_measurements está aplicada ao banco Supabase live (tabela public.patient_measurements: 9 colunas, RLS habilitado, 4 policies profile_id-only, índice composto (profile_id, patient_id, measured_on), CHECK ao-menos-uma-medida)."
    expected: "Supabase MCP list_tables (ou SQL editor) confirma tabela + RLS + 4 policies + índice + CHECK no projeto acstugafrgrqzvtuznxv."
    why_human: "O verificador não tem acesso às ferramentas Supabase MCP nesta sessão. O SQL da migration está correto e casa com o schema alegado, mas 'aplicado ao banco live' é estado de runtime que não pode ser observado a partir do filesystem. A 03-01-SUMMARY documenta a verificação via MCP list_tables (sessão anterior)."
  - test: "[Checkpoint 03-03 pendente] Teste manual end-to-end CRUD + isolamento entre médicos: logar como Médico A, criar/editar/remover medição de um paciente; tentar (via requisição forjada) alterar/apagar a medição estando logado como Médico B."
    expected: "Médico A faz CRUD normalmente; a mutação de Médico B sobre a medição de A retorna erro/no-op (RLS + escopo id+profile_id+patient_id bloqueiam). Nenhum vazamento entre médicos."
    why_human: "Requer duas contas reais e requisições autenticadas ao runtime — grep/testes unitários provam o escopo triplo no código (specs de ownership passam) mas não substituem o teste de isolamento ponta-a-ponta contra o banco live."
  - test: "[UAT geral pendente] Abrir o perfil de um paciente com medições no app rodando e inspecionar a curva: 4 tabs (peso/estatura/IMC/PC), toggle Percentil↔Escore-z, toggle Cronológica↔Corrigida (prematuro), pontos do paciente sobre as bandas, fonte + faixa etária visíveis, estado-vazio quando sexo é null, transição Intergrowth→OMS no termo corrigido."
    expected: "Gráficos renderizam corretamente, toggles re-avaliam sem recarregar, banda de prematuro transita para OMS, leituras de percentil/z/classificação corretas por medição."
    why_human: "Aparência visual, interação em tempo real (toggles), renderização Recharts e correção clínica das curvas exigem inspeção humana no app rodando."
prohibitions_reviewed:
  - statement: "NÃO forkar computePediatricAge nem lms-zscore (D-07 / RESEARCH Don't Hand-Roll)"
    status: verified
    verification: judgment
    evidence: "Única definição de computePediatricAge (lib/compute-pediatric-age.ts:149) e de lmsZScore/lmsValueAtZ (lib/lms-zscore.ts:19,30). growth-chart e preterm-transition importam, não redefinem."
  - statement: "NÃO tocar em patient-clinical-overview.tsx (D-08)"
    status: verified
    verification: judgment
    evidence: "git log: último commit do arquivo é 48d23d4 (redesign, pré-fase); nenhum commit da fase 03 (since 2026-07-09) o modifica."
  - statement: "NENHUM select/update/delete pode faltar escopo profile_id + patient_id (D-14 / IDOR)"
    status: verified
    verification: test
    evidence: "get/update/delete aplicam .eq('profile_id').eq('patient_id') (+ .eq('id') em update/delete); create insere row com profile_id explícito sob RLS. Specs de ownership (delete/update/get) asseveram os três filtros e passam."
notes:
  - "DESVIO CONHECIDO (aceitável, follow-up opcional): os coeficientes LMS do Intergrowth-21st foram reconstruídos por grid-search fit aos z-scores oficiais publicados (Intergrowth publica z-scores, não L/M/S). Evidência de qualidade: spot-checks reproduzem os valores publicados — M exato (z=0), z=±2 dentro de 0,02 kg / 0,15 cm; residual máx ~9g documentado. Recomendação: aceitável para a curva clínica desta fase; registrar follow-up para substituir por L/M/S oficiais se/quando publicados, ou validar contra uma segunda fonte."
---

# Phase 3: Curva de Crescimento — Verification Report

**Phase Goal:** O pediatra registra medições antropométricas de cada criança ao longo do tempo (peso, comprimento/estatura, PC e IMC derivado) e visualiza a curva de crescimento por idade — sobrepondo as medições às curvas de referência OMS (percentis/z-score) — mantendo histórico atualizável, posicionando cada medição pela idade pediátrica da Phase 1.
**Verified:** 2026-07-09
**Status:** human_needed (código verificado; 3 checkpoints manuais pendentes)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth (SC) | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Pediatra registra medição (data + peso/estatura/PC), IMC derivado, persiste escopada por profile_id+patient_id | ✓ VERIFIED | measurement-form → createMeasurementAction (paid gate + Zod + kg→g/cm→mm) → createMeasurement (insert com profile_id/patient_id) → revalidatePath; CHECK ao-menos-uma no banco + Zod refine; IMC derivado em read (growth-chart INDICATOR_META bmi-for-age); 448/448 testes passam |
| 2 | Pediatra vê 4 gráficos por idade com medições sobre curvas OMS (percentis/z), idade da Phase 1, fonte + faixa etária visíveis | ✓ VERIFIED | growth-chart.tsx: 4 tabs, Recharts ComposedChart, bandas via lmsValueAtZ sobre getReferenceTable, computePediatricAge posiciona; "Fonte: OMS (WHO) · faixa {ageMin}–{ageMax} meses" (linha 389); toggle Percentil↔Escore-z (PERCENTILE_Z_MAP / Z_LINES) |
| 3 | Pediatra edita/remove; gráficos refletem; read/write/delete com gate paid + escopo profile_id (sem acesso entre médicos) | ✓ VERIFIED | update/deleteMeasurementAction: paid gate + Zod + módulo escopado id+profile_id+patient_id; specs de ownership (IDOR guards) passam; edit mode + remove-measurement-dialog wired na history table; revalidatePath re-renderiza |

**Score:** 3/3 requirements · 15/15 must-have truths dos PLANs verificadas · 0 present-behavior-unverified

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| supabase/migrations/20260709000000_patient_measurements.sql | ✓ VERIFIED (arquivo) / ⚠ live-DB → human | Tabela + CHECK + índice composto + RLS enable + 4 policies profile_id-only. SQL correto; aplicação ao banco live não observável nesta sessão (ver human_verification) |
| modules/patient-growth/{types,create,get,update,delete}.ts | ✓ VERIFIED | 5 módulos, um export por arquivo, SupabaseClient injetado, escopo profile_id+patient_id em todas as leituras/mutações |
| actions/patient-growth/{create,update,delete}.ts + index.ts | ✓ VERIFIED | 3 actions com paid gate + Zod + revalidatePath; re-exportados em actions/index.ts |
| lib/schemas/patient-measurement.ts | ✓ VERIFIED | create + update schema; ranges, ao-menos-uma refine, rejeição de data futura (sem hack T12:00:00) |
| lib/lms-zscore.ts + lib/growth-classification.ts | ✓ VERIFIED | math pura; spec P50==M passa; classificação por z-cutoff reusa mapa de cor |
| lib/growth-reference/index.ts + 8 JSON WHO + 6 JSON Intergrowth | ✓ VERIFIED | 14 arquivos com source/version/ageMin/ageMax/standard + L/M/S por linha; getReferenceTable resolve standard='WHO'|'intergrowth' |
| lib/growth-reference/preterm-transition.ts | ✓ VERIFIED | resolveReferenceStandard: <37sem & corrected<0 → intergrowth; corrected>=0 → WHO |
| components/dashboard/patients/growth/{growth-section,measurement-form,measurement-history-table,growth-chart,growth-position-readout,remove-measurement-dialog}.tsx | ✓ VERIFIED | 6 componentes; growth-section montado abaixo de PatientClinicalOverview |
| recharts@3.9.0 | ✓ VERIFIED | importado em growth-chart ("use client") |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| patient-detail-content.tsx | getMeasurementsByPatient(supabase, profile.id, patient.id) | Promise.all server-side | ✓ WIRED |
| patient-detail-view.tsx | GrowthSection(patient, measurements) | montado abaixo de PatientClinicalOverview (linha 130) | ✓ WIRED |
| createMeasurementAction | createMeasurement | getAuthenticatedUser → paid → Zod → módulo → revalidatePath | ✓ WIRED |
| growth-chart | lms-zscore + growth-reference + computePediatricAge({correctedAgeCutoffMonths:36}) + preterm-transition | imports diretos | ✓ WIRED |
| history table → Editar/Remover | measurement-form (edit) / remove-measurement-dialog → delete action | ✓ WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite | `yarn test` | 448 pass / 0 fail | ✓ PASS |
| Typecheck | `yarn typecheck` | tsc --noEmit sem erros | ✓ PASS |
| Ownership IDOR (update/delete/get) | specs asseveram .eq id+profile_id+patient_id | pass | ✓ PASS |
| WHO P50==M spot-check | lms-zscore / reference spec | pass | ✓ PASS |
| Intergrowth reproduz z-scores publicados | reference spec (M exato, z=±2 dentro de 0,02kg/0,15cm) | pass | ✓ PASS |
| 14 JSONs metadata+LMS válidos | validação de shape | 14/14 OK | ✓ PASS |

### Requirements Coverage

| Requirement | Plans | Status | Evidence |
|-------------|-------|--------|----------|
| GROWTH-01 (registrar + editar/remover + histórico, escopo profile_id+patient_id) | 03-01, 03-03 | ✓ SATISFIED | create/update/delete + history table + specs |
| GROWTH-02 (curvas OMS + Intergrowth com fonte/faixa, percentis/z) | 03-02, 03-04 | ✓ SATISFIED | growth-chart + 14 refs + fonte/faixa na UI (marcada Pending em REQUIREMENTS.md — atualizar para Complete) |
| GROWTH-03 (posicionamento por idade corrigida + escopo + gate paid) | 03-01/02/03/04 | ✓ SATISFIED | computePediatricAge 36m + triple-scope + paid gate em todos os actions |

### Prohibitions Review

Todas as proibições dos 4 PLANs verificadas (ver frontmatter prohibitions_reviewed):
- Sem fork de computePediatricAge / lms-zscore — definições únicas em lib/.
- patient-clinical-overview.tsx intocado na fase 03 (D-08).
- Escopo profile_id+patient_id em toda mutação (D-14) — specs de ownership passam.
- Sem tabela de banco para referência (JSON estático), sem hack T12:00:00, "use client" no chart.

### Anti-Patterns Found

Nenhum. Scan dos arquivos da fase: sem TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER, sem stubs (return null são guards legítimos de interpolação/valores ausentes).

### Human Verification Required

3 itens (ver frontmatter):
1. Migration aplicada ao banco live (MCP indisponível nesta sessão).
2. [Checkpoint 03-03] Teste manual CRUD + isolamento entre médicos.
3. [UAT geral] Curva no app rodando (toggles, transição, correção clínica).

### Known Deviation (flag)

**Intergrowth-21st LMS reconstruídos por grid-search fit.** O Intergrowth publica z-scores, não coeficientes L/M/S; a fase reconstruiu L/S por linha ajustando aos z=-3..+3 publicados (M = mediana exata). Evidência de aceitabilidade: spot-checks reproduzem os valores oficiais (M exato; z=±2 dentro de 0,02 kg peso / 0,15 cm comprimento; residual máx ~9g documentado no source do JSON). **Veredito:** aceitável para a curva clínica desta fase — a precisão é da ordem do arredondamento das tabelas publicadas e a metadata documenta a origem com transparência. **Follow-up opcional (não bloqueante):** substituir por L/M/S oficiais caso publicados, ou validar contra uma segunda fonte de z-scores.

### Gaps Summary

Nenhum gap de código. Os 3 requisitos estão satisfeitos, os 15 truths dos PLANs verificados, suite verde (448/0), typecheck limpo, escopo IDOR + gate paid provados em código e testes de ownership, referências WHO+Intergrowth com metadata completa e fonte/faixa exibidas na UI. Status é `human_needed` (não `passed`) porque 3 verificações de runtime/visuais ficam fora do alcance automatizado: confirmação da migration no banco live, teste de isolamento entre médicos ponta-a-ponta, e UAT visual da curva. Nota: REQUIREMENTS.md ainda marca GROWTH-02 como Pending — atualizar para Complete.

---

_Verified: 2026-07-09_
_Verifier: Claude (gsd-verifier)_
