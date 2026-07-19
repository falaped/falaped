---
status: testing
phase: 05-calend-rio-de-vacinas-refer-ncia
source: [05-VERIFICATION.md, 05-REVIEW.md]
started: "2026-07-19T00:00:00Z"
updated: "2026-07-19T00:00:00Z"
---

## Current Test

number: 1
name: Criança — render de duas colunas (SUS × SBIm) e alinhamento por faixa etária
expected: |
  Em /dashboard/vaccines (aba Criança), as colunas SUS e SBIm aparecem lado a lado,
  alinhadas pela mesma faixa etária (ao nascer, 2, 3, 4, 5, 6, 9, 12, 15 meses, ...),
  com o marcador vazio (—) onde um dataset não tem item que o outro tem.
awaiting: user response

## Tests

### 1. Criança — duas colunas SUS × SBIm alinhadas
expected: Colunas SUS e SBIm lado a lado, alinhadas por faixa etária, com marcador vazio (—) onde falta item em um dataset.
result: [pending]

### 2. Gestante — aba e janelas por semana gestacional
expected: A aba Gestante lista por vacina (Hepatite B, dTpa a partir de 20 semanas, Influenza, COVID-19, VSR/Abrysvo 28–36 semanas) com a janela em texto.
result: [pending]

### 3. Proveniência por dataset na tela
expected: Cada coluna/lista mostra a legenda "Fonte: {version} · vigência …" e o aviso fixo de referência.
result: [pending]

### 4. Entrada por paciente + standalone sem destaque
expected: A partir da ficha do paciente, o link "Calendário de vacinas" abre /dashboard/vaccines?patientId=…; o standalone (sem patientId, ou id de outro médico) abre sem destaque de idade. Um patientId estranho não vaza paciente de outro médico.
result: [pending]

### 5. Destaque da faixa de idade atual — decisão clínica sobre prematuridade (CR-01)
expected: |
  Com um paciente, a faixa de idade atual é destacada em ambas as colunas (badge "Idade atual").
  DECISÃO CLÍNICA (CR-01): a correção por prematuridade NÃO está aplicada — o destaque usa a idade
  cronológica mesmo quando gestational_age_weeks está presente. Decidir: (a) aceitar o fallback
  cronológico para um destaque só de posicionamento; (b) corrigir o CR-01 para usar a idade corrigida;
  ou (c) remover a prop gestationalAgeWeeks (dead-effect) para não deixar meia-fiação.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
