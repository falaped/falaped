---
status: testing
phase: 06-disponibilidade-calend-rio-do-m-dico
source: [06-VERIFICATION.md]
started: 2026-07-21
updated: 2026-07-21
---

## Current Test

number: 1
name: Pintar a grade semanal, escolher duração por faixa e salvar disponibilidade
expected: |
  Logado como perfil paid em /dashboard/agenda, ao pintar a grade clicável,
  escolher duração por faixa e clicar em "Salvar disponibilidade": toast
  "Disponibilidade salva."; ao recarregar, a grade reflete as faixas salvas
  (recorrência semana após semana).
awaiting: user response

## Tests

### 1. Salvar grade semanal (click-to-toggle + duração por faixa)
expected: Toast "Disponibilidade salva."; ao recarregar, a grade reflete as faixas salvas (recorrência semana após semana).
result: [pending]

### 2. Folga de dia inteiro e folga parcial subtraem slots
expected: Os horários do dia inteiro somem por completo da grade; na folga parcial apenas os slots a partir da faixa bloqueada somem; a folga aparece na lista com badge neutro "Folga".
result: [pending]

### 3. Alternar Dia / Semana / Mês e navegar (viradas + fuso)
expected: Semana começa na segunda; nenhum slot duplicado ou sumido nas viradas; o mês mostra apenas dot + "N livres" por dia, nunca horários reais; fuso America/Sao_Paulo.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
