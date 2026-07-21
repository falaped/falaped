---
status: complete
phase: 05-calend-rio-de-vacinas-refer-ncia
source: [05-VERIFICATION.md, 05-REVIEW.md]
started: "2026-07-19T00:00:00Z"
updated: "2026-07-20T00:00:00Z"
---

## Current Test

[testing complete]

## Tests

### 1. Criança — duas colunas SUS × SBIm alinhadas
expected: Colunas SUS e SBIm lado a lado, alinhadas por faixa etária, com marcador vazio (—) onde falta item em um dataset.
result: pass

### 2. Gestante — aba e janelas por semana gestacional
expected: A aba Gestante lista por vacina (Hepatite B, dTpa a partir de 20 semanas, Influenza, COVID-19, VSR/Abrysvo 28–36 semanas) com a janela em texto.
result: pass

### 3. Proveniência por dataset na tela
expected: Cada coluna/lista mostra a legenda "Fonte: {version} · vigência …" e o aviso fixo de referência.
result: pass

### 4. Calendário vacinal na ficha — carrossel por idade + marcar doses tomadas (VAC-05)
expected: |
  Na ficha do paciente, a seção "Calendário vacinal" é um CARROSSEL: um slide por faixa de idade
  (união ordenada dos age_labels de AMBOS os datasets, SUS/PNI + particular/SBIm), com controles
  anterior/próxima e um indicador de posição ("N/M"). O slide INICIAL é a faixa de idade ATUAL da
  criança (badge "Idade atual"), resolvida com o MESMO motor do calendário (idade corrigida por
  prematuridade — CR-01 — quando há gestational_age_weeks de prematuro; fallback cronológico caso
  contrário). Cada slide mostra as vacinas SUS e SBIm daquela faixa juntas, cada linha com um CHECKBOX
  que reflete se o paciente já TOMOU aquele item de referência específico. O grão é por linha exibida:
  marcar a Pentavalente do SUS aos 2m NÃO marca a do SBIm (itens independentes). Marcar/desmarcar
  persiste por paciente (toggle + recarregar a página mantém o estado); a UI é otimista e reverte com
  toast PT-BR em caso de falha. Isolamento por dono: as marcas de um médico não aparecem para outro
  (escopo profile_id + patient_id, verify de posse no action). Somente posição (sem diff de pendência
  — isso é Phase 6). Sem dado de referência → a seção não aparece; erro de leitura das doses não
  derruba a ficha (degradação graciosa). Navegar prev/next percorre todas as idades.
result: pass

### 5. Destaque da faixa de idade atual — prematuridade aplicada (CR-01 resolvido)
expected: |
  Com um paciente, a faixa de idade atual é destacada em ambas as colunas (badge "Idade atual").
  CR-01 RESOLVIDO (fix 8f4a4d7): o destaque agora usa a idade CORRIGIDA por prematuridade quando há
  gestational_age_weeks de prematuro (< 37 sem); recém-nascidos a termo ou sem idade gestacional caem
  no fallback cronológico. Continua só de posicionamento (sem lógica de doses — isso é Phase 6).
  Verificar visualmente: um paciente prematuro é destacado na faixa fisiológica (corrigida), não na cronológica.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
