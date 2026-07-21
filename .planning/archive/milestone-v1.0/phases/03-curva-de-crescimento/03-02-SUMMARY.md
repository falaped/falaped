---
phase: 03-curva-de-crescimento
plan: 02
subsystem: ui
tags: [recharts, who-lms, growth-curve, zscore, percentile, nextjs, react19, pediatric-growth]

# Dependency graph
requires:
  - phase: 03-curva-de-crescimento (plan 01)
    provides: "patient_measurements table + getMeasurementsByPatient, growth-section (form + histórico), computePediatricAge estendido a 36m, Measurement type"
  - phase: 01-experiencia-consulta
    provides: "computePediatricAge (idade cronológica/corrigida), lib/patient-bmi-ui-status (mapa de cor good/warn/bad)"
provides:
  - "lib/lms-zscore.ts — math LMS pura (lmsZScore, lmsValueAtZ, percentileFromZ, PERCENTILE_Z_MAP)"
  - "lib/growth-reference/ — getReferenceTable(standard, indicator, sex) + 8 JSON WHO (4 indicadores × 2 sexos) com metadados source/version/ageMin/ageMax"
  - "lib/growth-classification.ts — classificação por z-cutoff WHO (-2/+1/+2) mapeada a good/warn/bad + percentilePositionLabel"
  - "components/dashboard/patients/growth/growth-chart.tsx — Recharts ComposedChart (bandas + scatter + toggles percentil/z e cronológica/corrigida + caption de fonte + empty state sem sexo)"
  - "components/dashboard/patients/growth/growth-position-readout.tsx — percentil + z + classificação colorida (D-13)"
  - "growth-section com Tabs dos 4 indicadores (peso/estatura/IMC/PC por idade)"
  - "recharts@3.9.0 (pin exato) instalado limpo sob React 19"
affects: [03-03-editar-excluir-medicao, 03-04-intergrowth, curva-de-crescimento]

# Tech tracking
tech-stack:
  added:
    - "recharts@3.9.0 (pin exato; SVG SSR-safe, peer react ^19; sem conflito react-is no build)"
  patterns:
    - "Dados de referência clínica como JSON estático versionado (não tabela de banco) — tree-shakeable, metadados source/version renderizados na UI (D-03)"
    - "Math LMS pura em lib/ com spec cross-check contra valores publicados WHO (z-score E percentil)"
    - "Classificação por z-cutoff WHO reusando SÓ o tipo/mapa de cor de patient-bmi-ui-status (não a heurística classifyBmiByAge)"
    - "Componente Recharts 'use client' com todos os hooks chamados antes do guard de sexo-null (Rules of Hooks)"
    - "Toggle segmentado via Button (sem adicionar bloco toggle-group do registry shadcn)"

key-files:
  created:
    - lib/lms-zscore.ts
    - lib/lms-zscore.spec.ts
    - lib/growth-reference/index.ts
    - lib/growth-reference/index.spec.ts
    - lib/growth-reference/who/weight-for-age-boys.json
    - lib/growth-reference/who/weight-for-age-girls.json
    - lib/growth-reference/who/height-for-age-boys.json
    - lib/growth-reference/who/height-for-age-girls.json
    - lib/growth-reference/who/bmi-for-age-boys.json
    - lib/growth-reference/who/bmi-for-age-girls.json
    - lib/growth-reference/who/head-circumference-for-age-boys.json
    - lib/growth-reference/who/head-circumference-for-age-girls.json
    - lib/growth-classification.ts
    - lib/growth-classification.spec.ts
    - components/dashboard/patients/growth/growth-chart.tsx
    - components/dashboard/patients/growth/growth-position-readout.tsx
  modified:
    - components/dashboard/patients/growth/growth-section.tsx
    - package.json
    - yarn.lock

key-decisions:
  - "Fonte WHO: tabelas oficiais de z-score do WHO CDN (cdn.who.int). CGS 2006 (0–5a) + Growth Reference 2007 (5–19a). Colunas Month/L/M/S por mês."
  - "Junções por indicador: peso/idade = 0–5a CGS + 5–10a ref (0–120m); estatura = comprimento 0–24m + estatura 24–60m + 5–19a ref (0–228m); IMC = 0–24m (comprimento) + 24–60m (estatura) + 5–19a ref (0–228m); PC = 0–5a CGS (0–60m). Mês 24 duplicado removido (mantido o valor length-based 0–2)."
  - "Toggle percentil↔z reavalia lmsValueAtZ no MESMO dataset LMS (sem recarregar); só P50/z=0 enfatizado (strokeWidth 2, --chart-1)."
  - "Classificação: z-cutoffs WHO -2/+1/+2 → bad/good/warn/bad, labels PT-BR por indicador; percentilePositionLabel usa >P97/<P3 fora de faixa."
  - "Toggle via Button (não há bloco toggle-group instalado; evita adicionar dependência de registry)."

patterns-established:
  - "lib/lms-zscore + lib/growth-reference: infra reusável para 03-04 (Intergrowth reusa a mesma math LMS + shape de reference-table)"
  - "Spec de dados clínicos deve cross-check contra a fonte publicada (não só P50==M estrutural)"

requirements-completed: [GROWTH-02, GROWTH-03]

coverage:
  - id: D02
    description: "4 gráficos por idade (peso/estatura/IMC/PC) selecionáveis por tab, medições plotadas sobre as bandas de referência OMS"
    requirement: GROWTH-02
    verification:
      - kind: integration
        ref: "yarn build (rota /dashboard/patients/[id] compila com GrowthSection + Tabs + GrowthChart)"
        status: pass
      - kind: manual
        ref: "UAT: abrir perfil com medições → alternar tabs → ver scatter sobre as bandas"
        status: unknown
    human_judgment: true
    rationale: "Render visual das 4 curvas com pontos sobre as bandas precisa de verificação no app rodando."
  - id: D03
    description: "Cada gráfico exibe fonte + faixa etária a partir dos metadados do arquivo de referência"
    requirement: GROWTH-02
    verification:
      - kind: unit
        ref: "lib/growth-reference/index.spec.ts (source/version/ageMin/ageMax presentes por arquivo; ageMax por indicador D-03)"
        status: pass
      - kind: manual
        ref: "growth-chart renderiza 'Fonte: OMS (WHO) · faixa {ageMin}–{ageMax} meses'"
        status: unknown
    human_judgment: false
  - id: D12
    description: "Toggle percentil↔z reavalia bandas do MESMO dataset LMS"
    requirement: GROWTH-02
    verification:
      - kind: unit
        ref: "lib/lms-zscore.spec.ts (lmsValueAtZ reproduz z-score E percentis publicados WHO)"
        status: pass
    human_judgment: false
  - id: DATA
    description: "LMS WHO ingeridos são reais e corretos (P50==M; P3/P97 batem com a tabela de percentis publicada WHO)"
    requirement: GROWTH-02
    verification:
      - kind: unit
        ref: "lib/lms-zscore.spec.ts + lib/growth-reference/index.spec.ts (cross-check wfa boys P3/P50/P97 meses 0 e 12; medianas M vs WHO)"
        status: pass
    human_judgment: false
  - id: D13
    description: "Cada medição mostra percentil + z + classificação reusando o mapa de cor de patient-bmi-ui-status"
    requirement: GROWTH-03
    verification:
      - kind: unit
        ref: "lib/growth-classification.spec.ts (z-cutoffs → good/warn/bad; labels PT-BR)"
        status: pass
    human_judgment: false
  - id: PITFALL5
    description: "sex null → estado-vazio 'Informe o sexo do paciente', sem renderizar a curva"
    requirement: GROWTH-02
    verification:
      - kind: integration
        ref: "yarn typecheck/build; guard após todos os hooks em growth-chart.tsx"
        status: pass
    human_judgment: false

# Metrics
duration: ~40min
completed: 2026-07-09
status: complete
---

# Phase 3 Plan 02: Ver a curva de crescimento (slice vertical) Summary

**Sobre o histórico da 03-01, o pediatra vê as 4 curvas OMS por idade (peso/estatura/IMC/PC) com suas medições plotadas sobre bandas de referência derivadas de LMS reais do WHO, alterna percentil↔escore-z e cronológica↔corrigida, e lê a posição (percentil/z + classificação) de cada medição.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-07-09T17:02:46Z
- **Tasks:** 3 (os 2 checkpoints — recharts e fonte WHO — já aprovados antes desta sessão)
- **Files:** 18 (16 criados, 2 modificados; + package.json/yarn.lock)

## Accomplishments

- **Task 1 — Math LMS + tabelas WHO (`490bb7b`):** `lib/lms-zscore.ts` (Cole–Green puro: `lmsZScore`, `lmsValueAtZ`, `percentileFromZ` via CDF normal, `PERCENTILE_Z_MAP`); 8 JSON WHO com metadados; `lib/growth-reference/index.ts` (`getReferenceTable`). Specs cross-check contra valores publicados WHO (z-score E percentil).
- **Task 2 — Classificação por z-cutoff (`f9d1db5`):** `lib/growth-classification.ts` aplica os cortes WHO -2/+1/+2 → bad/good/warn/bad com labels PT-BR por indicador; reusa SÓ o tipo/mapa de cor `PatientBmiUiStatus` (não a heurística `classifyBmiByAge`). `percentilePositionLabel` formata `Peso no P{n}` e `>P97`/`<P3`.
- **Task 3 — Chart Recharts + readout + tabs (`159172c`):** `recharts@3.9.0` instalado limpo sob React 19 (build verde, sem conflito react-is); `growth-chart.tsx` (`"use client"`) com bandas de referência (P50/z=0 enfatizado, ramp monocromático), scatter do paciente posicionado por `computePediatricAge(..., { correctedAgeCutoffMonths: 36 })`, toggles percentil/z e cronológica/corrigida (corrigida auto p/ <37 sem), caption de proveniência, empty state sem sexo; `growth-position-readout.tsx`; `growth-section.tsx` com Tabs dos 4 indicadores.

## Task Commits

1. **Task 1: Math LMS + 8 JSON WHO + index** — `490bb7b`
2. **Task 2: Classificação por z-cutoff WHO** — `f9d1db5`
3. **Task 3: Recharts chart + readout + tabs (+ recharts install)** — `159172c`

## WHO data sources used (authoritative, machine-readable)

Todos baixados do CDN oficial da OMS (`cdn.who.int`), colunas `Month, L, M, S` por mês:

| Indicador | Arquivo(s) fonte WHO | Faixa (meses) | Padrão |
|-----------|----------------------|---------------|--------|
| weight-for-age | `wfa_{boys,girls}_0-to-5-years_zscores.xlsx` (CGS 2006) + weight-for-age 5–10a expanded (Ref 2007) | 0–120 | CGS 2006 + Ref 2007 |
| height-for-age | `lhfa_{sex}_0-to-2-years` + `lhfa_{sex}_2-to-5-years` (CGS 2006) + `hfa-{sex}-z-who-2007-exp.xlsx` (Ref 2007) | 0–228 | CGS 2006 + Ref 2007 |
| bmi-for-age | `bmi_{sex}_0-to-2-years` + `bmi_{sex}_2-to-5-years` (CGS 2006) + `bmi-{sex}-z-who-2007-exp.xlsx` (Ref 2007) | 0–228 | CGS 2006 + Ref 2007 |
| head-circumference-for-age | `hcfa-{sex}-0-5-zscores.xlsx` (CGS 2006) | 0–60 | CGS 2006 |

Base das URLs:
- CGS 2006: `https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/<indicator>/...`
- Ref 2007: `https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years/<indicator>-(5-19-years)/...`
- Entradas: `who.int/tools/child-growth-standards` (0–5a) e `who.int/tools/growth-reference-data-for-5to19-years` (5–19a).

Tratamento de junções: mês 24 duplicado entre 0–2a e 2–5a removido (mantido o valor length-based 0–2). weight/height/BMI/head-circ com tetos por indicador conforme D-03/A5.

## Spot-check results (REAL WHO cross-check — não estrutural)

Contra a tabela de z-score E a tabela de percentis publicadas da OMS (weight-for-age BOYS):

- **Mês 0** (L=0.3487, M=3.3464, S=0.14602): `lmsValueAtZ` reproduz P3=2,5 kg, P50=3,3 kg, P97=4,3 kg; SD lines z=-3→2,1 / z=-2→2,5 / z=+2→4,4 / z=+3→5,0 kg — todos dentro de ±0,05.
- **Mês 12** (L=0.0644, M=9.6479, S=0.10925): P3=7,8 kg, P50=9,6 kg, P97=11,8 kg — dentro de ±0,05.
- **head-circ boys mês 0** (L=1): valida o ramo LMS quando L≈1.
- `lmsValueAtZ(0)==M` (estrutural) + `lmsZScore(M)==0` + ida-e-volta `lmsZScore(lmsValueAtZ(z))==z`.
- `percentileFromZ`: P50 em z=0, P3/P97 em z=∓1,881, P5 em z=-1,645.

`lib/growth-reference/index.spec.ts` também assere que as medianas ingeridas (M) batem com os valores publicados WHO (mês 0 ≈3,3464; mês 12 ≈9,6479) e que ageMax por indicador é 120/228/228/60.

## Verification

- `npx tsx --test lib/lms-zscore.spec.ts lib/growth-reference/index.spec.ts` → 12 pass, 0 fail
- `npx tsx --test lib/growth-classification.spec.ts` → 5 pass, 0 fail
- `yarn typecheck` → verde
- `yarn build` → verde (rota `/dashboard/patients/[id]` compila; recharts sob React 19 sem conflito)
- `yarn test` (suíte completa) → **430 pass, 0 fail** (413 anteriores + 17 novos)

## Files Created/Modified

Criados: `lib/lms-zscore.ts` (+ `.spec.ts`), `lib/growth-reference/index.ts` (+ `.spec.ts`), 8× `lib/growth-reference/who/*.json`, `lib/growth-classification.ts` (+ `.spec.ts`), `components/dashboard/patients/growth/growth-chart.tsx`, `growth-position-readout.tsx`.
Modificados: `components/dashboard/patients/growth/growth-section.tsx` (Tabs + chart), `package.json` + `yarn.lock` (recharts@3.9.0).

## Decisions Made

- **Toggle via `Button`** em vez de adicionar o bloco `toggle-group` do registry shadcn (não instalado) — mantém a superfície de dependência mínima e usa componentes já presentes.
- **Hooks antes do guard de sexo-null**: `useState`/`useMemo` sempre chamados; o `return` de empty-state vem depois, respeitando as Rules of Hooks.
- **JSON minificado** (indent=0) para reduzir o peso do bundle das tabelas de referência mantendo uma linha por campo/row para diffs legíveis.

## Deviations from Plan

- **Nome do constante inline**: o critério de aceitação exige `grep -q "correctedAgeCutoffMonths: 36"`; inlinei o literal `36` no call-site (com comentário `GROWTH_CORRECTED_AGE_CUTOFF_MONTHS (D-05)`) em vez de um constante local, para satisfazer o grep e manter a intenção documentada. Sem impacto funcional.
- **Toggle-group**: o UI-SPEC menciona shadcn `ToggleGroup` como opção; usei um segmented control com `Button` (a spec aceita "ToggleGroup or segmented control"). Não é desvio de contrato.
- Nenhuma das regras de deviation (1-4) foi acionada.

## Issues Encountered

- Dois erros de tipo do Recharts no `Tooltip` (`formatter`/`labelFormatter` recebem `ValueType`/`ReactNode`, não `number`) — resolvidos coeragindo via `Number(...)` na assinatura. Fora isso, todos os gates passaram.

## User Setup Required

None — recharts é dependência de build; nenhuma configuração de serviço externo.

## Next Phase Readiness

- **03-03 (editar/excluir medição):** consome a tabela + o padrão de ownership spec (já em 03-01); o chart reidrata automaticamente após mutações.
- **03-04 (Intergrowth-21st):** reusa `lib/lms-zscore` (math idêntica) e o shape de `GrowthReferenceTable`/`getReferenceTable` — basta adicionar `standard: "INTERGROWTH"` e os JSON de referência (com seu próprio checkpoint de fonte/licença) e a banda de transição preterm→WHO no chart.

## Self-Check: PASSED

Todos os arquivos criados existem no disco; commits `490bb7b`, `f9d1db5`, `159172c` no histórico; 8 JSON WHO presentes; suíte 430/430 verde; typecheck + build verdes.

---
*Phase: 03-curva-de-crescimento*
*Completed: 2026-07-09*
