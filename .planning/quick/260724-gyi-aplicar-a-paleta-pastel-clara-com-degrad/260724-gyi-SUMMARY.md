---
phase: 260724-gyi
plan: 01
subsystem: agenda-ui
status: incomplete
tags: [agenda, ui, palette, css, calendar]
requirements: [G-1, G-2, G-3, G-4, G-5, G-6]
dependency-graph:
  requires: [f3j (verde --calendar-available*, agora aposentado)]
  provides: [paleta --agenda-* (light + dark), classes .agenda-*]
  affects: [Agenda Dia/Semana/Mês, legenda/chips que consomem APPOINTMENT_STATUS_STYLE]
tech-stack:
  added: []
  patterns: [CSS vars oklch + linear-gradient(160deg) centralizadas em globals.css; consumo por className]
key-files:
  created: []
  modified:
    - app/globals.css
    - components/dashboard/agenda/appointment-status-style.ts
    - components/dashboard/agenda/calendar-time-grid.tsx
    - components/dashboard/agenda/calendar-month-indicator.tsx
metrics:
  tasks-completed: 2
  tasks-total: 3
  completed: 2026-07-24
---

# Quick Task 260724-gyi: Aplicar paleta pastel clara com degradê na Agenda — Summary

Paleta pastel clara com degradê (oklch) aplicada na Agenda a partir do mockup aprovado: fundo da grade (disponível=menta degradê, folga=areia degradê+hachura, vazio=branco) e os 5 status da consulta em tons pastéis distintos, mantendo ícone e forma (pendente tracejado, cancelada hachura+riscado, demais borda sólida). Cores centralizadas em `globals.css` como vars `--agenda-*` (light + dark) + classes `.agenda-*`; verde saturado do f3j (`--calendar-available*`) aposentado. Camada de UI apenas — nenhum comportamento alterado. **As 2 tasks `auto` estão completas e verificadas; a Task 3 (checkpoint visual [BLOCKING]) aguarda sign-off humano no light E no dark.**

## Paleta aplicada (globals.css)

Bloco novo no fim de `globals.css` (`:root` + `.dark` + `@layer utilities`), valores EXATOS do mockup no light (G-1); dark dentro das faixas de G-5.

**Fundo (camada de disponibilidade):**
- `--agenda-avail` / `--agenda-avail-line` / `--agenda-avail-ink` (menta, h162) → classe `.agenda-avail`
- `--agenda-folga` / `--agenda-folga-line` / `--agenda-folga-ink` (areia, h75) + `--agenda-folga-hatch` → classe `.agenda-folga`
- `--agenda-vazio` (branco) → classe `.agenda-vazio`

**Status da consulta (fill + `-line` + `-ink`):**
- `--agenda-st-pending` (pêssego, h72) → `.agenda-st-pending`
- `--agenda-st-confirmed` (azul pastel, h248) → `.agenda-st-confirmed`
- `--agenda-st-done` (lavanda, h300) → `.agenda-st-done`
- `--agenda-st-no_show` (rosa, h22) → `.agenda-st-no_show`
- `--agenda-st-canceled` (neutro, h262) + `--agenda-canceled-hatch` → `.agenda-st-canceled`

**Consumo:**
- `calendar-time-grid.tsx`: fundo read-only usa `.agenda-avail` / `.agenda-folga` / `.agenda-vazio`; overlay de hachura da Cancelada consome `var(--agenda-canceled-hatch)`.
- `appointment-status-style.ts`: campo `cell` de cada status = layout de borda (`border` / `border border-dashed`) + classe de cor `.agenda-st-*`; ícones e flags `strike`/`hatch` inalterados.
- `calendar-month-indicator.tsx`: ponto de disponibilidade usa `var(--agenda-avail-line)`.
- Dark: mesmos matizes com claridade adaptada (fills L~0.26–0.34, bordas L~0.42–0.52, texto L~0.82–0.9; alphas de hachura elevados p/ visibilidade no escuro).

## Commits (código)

| Task | Nome | Commit | Arquivos |
| ---- | ---- | ------ | -------- |
| 1 (tracer) | Paleta em globals.css + fundo da grade | `b6b943a` | app/globals.css, components/dashboard/agenda/calendar-time-grid.tsx |
| 2 (auto) | 5 status pastéis + ponto do Mês; aposenta verde f3j | `66f6d7c` | app/globals.css, appointment-status-style.ts, calendar-month-indicator.tsx, calendar-time-grid.tsx |

## Verify results (verbatim)

**Task 1:**
- `yarn typecheck` → `Done in 2.60s.` (passa)
- hex/rgb em calendar-time-grid.tsx → `0`
- `agenda-avail` + `agenda-st-canceled` em globals.css → `OK`
- `agenda-avail` em calendar-time-grid.tsx → `OK`

**Task 2:**
- `yarn typecheck` → `Done in 2.59s.` (passa)
- `grep -c "calendar-available" app/globals.css` → `0`
- `calendar-available` em components/dashboard/agenda/ → `(none)`
- hex/rgb nos 3 .tsx tocados → `0`
- `agenda-st-pending` em globals.css + `agenda-st-canceled` em appointment-status-style.ts → `OK`
- `yarn build` → `Done in 14.91s.` (passa)

**Remoção do f3j:** `--calendar-available*` = 0 em globals.css e 0 nos componentes de agenda (4 ocorrências + comentários E-1 removidas).

## Deviations from Plan

**None — plano executado conforme escrito.**

Nota (não é desvio): o primeiro `grep -c "calendar-available"` retornou `1` porque um comentário meu no novo bloco da paleta citava o nome da var antiga; reescrevi o comentário ("vars antigas aposentadas") — passou a `0`. Nenhuma mudança de código/comportamento.

## Known Stubs

None. Nenhum valor hardcoded/placeholder introduzido; só cor.

## Pending [BLOCKING] Checkpoint (Task 3 — human-verify)

**Status:** aguardando sign-off humano. NÃO auto-aprovado.

Verificação visual em `/dashboard/agenda` (`yarn dev`), no LIGHT e no DARK:
1. Fundo da grade Dia/Semana: disponível=menta degradê; folga=areia degradê+hachura; vazio=branco.
2. 5 status: pendente (pêssego, borda TRACEJADA, ícone relógio), confirmada (azul pastel), realizada (lavanda), falta (rosa), cancelada (neutro + HACHURA + nome RISCADO) — todos distintos e legíveis, nada saturado/escuro demais.
3. Aba Mês: ponto de disponibilidade em menta.
4. Legenda/chips herdam as cores dos status.
5. Dark: mesmos matizes, claridade adaptada, tudo legível (hachura visível).
6. Nenhum comportamento mudou (clicar slot livre abre criação; clicar consulta abre detalhe; linha de agora azul).

**Resume-signal:** "approved" (light E dark corretos) ou descrever ajustes.

## Self-Check: PASSED

- app/globals.css — FOUND (paleta --agenda-* + classes .agenda-* em :root e .dark)
- components/dashboard/agenda/appointment-status-style.ts — FOUND
- components/dashboard/agenda/calendar-time-grid.tsx — FOUND
- components/dashboard/agenda/calendar-month-indicator.tsx — FOUND
- Commit b6b943a — FOUND
- Commit 66f6d7c — FOUND
