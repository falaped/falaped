---
phase: 03-curva-de-crescimento
plan: 04
subsystem: ui
tags: [intergrowth-21st, preterm, corrected-age, who-transition, lms-zscore, growth-curve, pediatric-growth]

# Dependency graph
requires:
  - phase: 03-curva-de-crescimento (plan 02)
    provides: "lib/lms-zscore.ts (LMS math), lib/growth-reference/ (getReferenceTable + 8 JSON WHO), growth-chart.tsx (bandas + toggles + scatter + empty state)"
  - phase: 03-curva-de-crescimento (plan 01)
    provides: "computePediatricAge estendido a 36m ({ correctedAgeCutoffMonths }), Measurement type"
provides:
  - "lib/growth-reference/intergrowth/ — 6 JSON Intergrowth-21st preterm (peso/comprimento/PC × 2 sexos) com metadados source/version/ageMin/ageMax e standard=intergrowth"
  - "lib/growth-reference/index.ts — getReferenceTable resolve standard='intergrowth' (mesma função, sem fork); hasIntergrowthTable(indicator)"
  - "lib/growth-reference/preterm-transition.ts — resolveReferenceStandard({ gestationalAgeWeeks, correctedAgeMonths }) puro (regra A1 Intergrowth→OMS)"
  - "growth-chart.tsx — banda Intergrowth no segmento pré-termo transitando para OMS no termo corrigido, com caption de proveniência por segmento"
affects: [curva-de-crescimento]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reconstrução LMS a partir de tabela de z-score publicada: M = valor z=0 (exato); L,S ajustados por grid-search para reproduzir os valores z=-3..+3 oficiais (resíduo < 0.01 kg / < 0.09 cm)"
    - "Standard de referência resolvido por posição na idade corrigida (transição pura), consumido tanto pelas bandas quanto pelo z-score dos pontos do paciente"
    - "Bandas contíguas de dois standards no mesmo eixo x de idade corrigida (Intergrowth ageMonths<=0 + OMS ageMonths>=0)"
    - "Indicador sem tabela Intergrowth (IMC) permanece OMS-only via hasIntergrowthTable"

key-files:
  created:
    - lib/growth-reference/intergrowth/weight-newborn-boys.json
    - lib/growth-reference/intergrowth/weight-newborn-girls.json
    - lib/growth-reference/intergrowth/length-newborn-boys.json
    - lib/growth-reference/intergrowth/length-newborn-girls.json
    - lib/growth-reference/intergrowth/head-circumference-newborn-boys.json
    - lib/growth-reference/intergrowth/head-circumference-newborn-girls.json
    - lib/growth-reference/preterm-transition.ts
    - lib/growth-reference/preterm-transition.spec.ts
  modified:
    - lib/growth-reference/index.ts
    - lib/growth-reference/index.spec.ts
    - components/dashboard/patients/growth/growth-chart.tsx

key-decisions:
  - "Standard escolhido: Intergrowth-21st International Postnatal Growth Standards for Preterm Infants (Villar et al. Lancet Glob Health 2015), NÃO o Newborn Size-at-Birth. O padrão postnatal é longitudinal (PMA 27–64 semanas) e é exatamente a curva do período pré-termo→termo corrigido; o Newborn Size é cross-sectional (um valor por IG ao nascer) e não tem o shape de curva por idade corrigida."
  - "Eixo x: ageMonths = (PMA − 40 semanas) convertido para meses (÷ 30.4375/7). PMA 40 → 0 meses (termo corrigido); PMA 27 → −2.99; PMA 64 → +5.52. Mapeia direto no eixo de idade corrigida."
  - "LMS por linha: M = valor publicado em z=0 (garante spot-check P50==M exato). L,S ajustados por grid-search coarse-to-fine minimizando erro contra os 7 valores z=-3..+3 oficiais. Peso é assimétrico (L≈0, ~log-normal); comprimento/PC quase simétricos (L≈0.5 para PC, L<0 para comprimento)."
  - "IMC não tem padrão Intergrowth de RN — omitido (3 indicadores × 2 sexos = 6 arquivos). getReferenceTable('intergrowth','bmi-for-age',...) lança erro; hasIntergrowthTable('bmi-for-age') é false; a curva de IMC segue OMS-only."
  - "Regra de transição A1: IG≥37 → sempre OMS; prematuro & corrigida<0 → intergrowth; prematuro & corrigida≥0 → OMS. IG desconhecida → tratada como termo (OMS), casando com o motor de idade corrigida."
  - "Banda Intergrowth só aparece no eixo de idade CORRIGIDA (o conceito de pré-termo é idade corrigida). Em idade cronológica o gráfico segue OMS-only mesmo para prematuro."
  - "Segmentos contíguos: linha Intergrowth inclui a linha do termo (ageMonths 0) para encostar visualmente na linha OMS que começa em 0."

intergrowth-source:
  url-tools-page: "https://intergrowth21.com/tools-resources/postnatal-growth-preterm-infants"
  files-ingested:
    - "https://intergrowth21.com/sites/default/files/2023-02/grow_preterm-zs-boys_bw_table.pdf (peso meninos)"
    - "https://intergrowth21.com/sites/default/files/2023-02/grow_preterm-zs-girls_bw_table.pdf (peso meninas)"
    - "https://intergrowth21.com/sites/default/files/2023-02/grow_preterm-zs-boys_lt_table.pdf (comprimento meninos)"
    - "https://intergrowth21.com/sites/default/files/2023-02/grow_preterm-zs-girls_lt_table.pdf (comprimento meninas)"
    - "https://intergrowth21.com/sites/default/files/2023-02/grow_preterm-zs-boys_hc_table.pdf (PC meninos)"
    - "https://intergrowth21.com/sites/default/files/2023-02/grow_preterm-zs-girls_hc_table.pdf (PC meninas)"
  citation: "Villar J, et al. Postnatal growth standards for preterm infants: the Preterm Postnatal Follow-up Study of the INTERGROWTH-21st Project. Lancet Glob Health 2015;3:e681-91. © University of Oxford."
  coverage: "3 indicadores (peso, comprimento→height-for-age, perímetro cefálico) × 2 sexos = 6 tabelas. PMA 27–64 semanas exatas (38 linhas cada) = idade corrigida −2.99 a +5.52 meses."
  redistribution: "Aprovado pelo usuário/médico no checkpoint (blocking-human RESOLVED) — LMS versionados incluídos no repositório."

spot-check:
  - "Peso meninos, PMA 40 (corrigida 0): M=3.43 kg == valor publicado z=0. lmsValueAtZ(0)==M (exato). lmsValueAtZ(-2)=2.59 kg vs publicado 2.59; lmsValueAtZ(+2)=4.54 kg vs publicado 4.54 (dentro de 0.02)."
  - "Comprimento meninos, PMA 40 (corrigida 0): M=50.9 cm == z=0 publicado. lmsValueAtZ(-2)≈47.3 e lmsValueAtZ(+2)≈54.8 vs publicado 47.3/54.8 (dentro de 0.15)."
  - "Resíduo máximo do ajuste LMS sobre todas as 6 tabelas: peso 0.009 kg (~9 g); comprimento 0.088 cm; PC 0.073 cm — todos abaixo da precisão publicada (0.01 kg / 0.1 cm)."

verification:
  task-1: "npx tsx --test lib/growth-reference/index.spec.ts lib/growth-reference/preterm-transition.spec.ts → 13 pass, 0 fail; yarn typecheck OK"
  task-2: "yarn typecheck OK; yarn build OK (Done in 15.53s)"
  full-suite: "yarn test → 448 pass, 0 fail (baseline 439 + 9 novos testes Intergrowth)"

commits:
  - "ec39cee feat(03-04): add Intergrowth-21st preterm LMS + reference-index resolution + transition rule"
  - "2bc3700 feat(03-04): draw Intergrowth-21st preterm band transitioning to WHO at term"

deviations:
  - "Nenhum indicador ficou inobtenível: todas as 6 tabelas (peso/comprimento/PC × 2 sexos) foram obtidas das tabelas oficiais de z-score do intergrowth21.com."
  - "A tabela postnatal do Intergrowth é publicada como z-scores (medidas em z=-3..+3), não como coeficientes LMS diretos. Ela é um modelo skew-t; reconstruímos {L,M,S} por linha para o motor lms-zscore da 03-02 SEM forkar a math — M é o valor oficial em z=0 e L,S ajustam-se aos 7 valores oficiais com resíduo desprezível (< precisão publicada). Não há fabricação: os valores-alvo são os oficiais."
  - "Os 6 arquivos combinam os dois specs de tarefa: um único commit por tarefa (Task 1 = dados+lib+specs; Task 2 = componente), conforme protocolo."

must_haves_check:
  - "Curvas cobrem o período pré-termo com Intergrowth transitando para OMS no termo corrigido (D-01/D-04/OQ1): DONE"
  - "Prematuro com corrigida<0 plota sobre Intergrowth; a partir do termo corrigido plota sobre OMS (A1): DONE (bandas + z-score dos pontos)"
  - "getReferenceTable aceita standard='intergrowth' com rows + source/version/ageMin/ageMax (D-03): DONE"
  - "Banda Intergrowth exibe fonte + faixa a partir dos metadados (D-03): DONE (caption por segmento)"
  - "Math reusa lib/lms-zscore.ts e a infra de reference-index da 03-02 sem forkar: DONE"
  - "Sem tabela de banco — JSON estático versionado: DONE"
  - "patient-clinical-overview.tsx NÃO tocado (D-08): DONE (fora do diff)"
---

# 03-04 — Curva do prematuro (Intergrowth-21st → OMS)

Slice vertical que adiciona a referência Intergrowth-21st ao período pré-termo/RN sobre a infra de LMS + reference-index + growth-chart da 03-02, com transição para OMS no termo corrigido (regra A1).

## O que foi entregue

**Task 1** — 6 JSON Intergrowth-21st versionados (peso, comprimento, PC × meninos/meninas) das tabelas oficiais de z-score do intergrowth21.com (Villar 2015, PMA 27–64 semanas). `getReferenceTable` estendido para resolver `standard='intergrowth'` na mesma função (sem fork), com `hasIntergrowthTable` para indicadores sem cobertura (IMC). `preterm-transition.ts` com a regra pura Intergrowth→OMS. Specs estendidos com spot-check P50==M e cross-check dos z-scores publicados.

**Task 2** — `growth-chart.tsx` desenha a banda Intergrowth no segmento pré-termo (idade corrigida < 0) transitando para OMS no termo corrigido, como segmentos contíguos no eixo de idade corrigida, com caption de proveniência por segmento. Pontos do paciente z-scoreados contra o standard resolvido por posição. IMC segue OMS-only; não-prematuro inalterado.

Ver frontmatter para fontes exatas, spot-checks, verificação e commits.
