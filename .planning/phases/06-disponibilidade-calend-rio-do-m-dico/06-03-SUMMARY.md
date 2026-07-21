---
phase: 06-disponibilidade-calend-rio-do-m-dico
plan: 03
subsystem: availability
tags: [availability, calendar, actions, ui, rsc]
requires:
  - "modules/availability/* (Plano 06-01): CRUD escopado por profile_id"
  - "lib/expand-availability.ts + lib/clinic-timezone.ts (Plano 06-02): expansão pura"
  - "lib/schemas/availability.ts (Plano 06-01): schemas Zod"
provides:
  - "saveAvailabilityRulesAction, createAvailabilityExceptionAction, deleteAvailabilityExceptionAction"
  - "/dashboard/agenda (RSC route)"
  - "AgendaView, AvailabilityGrid, ExceptionDialog client components"
  - "sidebar Agenda entry"
affects:
  - "actions/index.ts (barrel raiz)"
  - "components/app-sidebar.tsx"
tech-stack:
  added: []
  patterns:
    - "Server Action com gate auth+paid+Zod + result union (molde toggle-patient-vaccine-dose)"
    - "RSC expande slots server-side no fuso da clínica; serializa Date→ISO para o client"
    - "CSS grid custom Tailwind (gridTemplateColumns/Rows) para grade de agenda — sem lib de calendário"
key-files:
  created:
    - actions/availability/save-availability-rules.ts
    - actions/availability/create-availability-exception.ts
    - actions/availability/delete-availability-exception.ts
    - actions/availability/index.ts
    - app/dashboard/agenda/page.tsx
    - components/dashboard/agenda/agenda-view.tsx
    - components/dashboard/agenda/availability-grid.tsx
    - components/dashboard/agenda/exception-dialog.tsx
  modified:
    - actions/index.ts
    - components/app-sidebar.tsx
decisions:
  - "Navegação Dia/Semana/Mês re-agrupa client-side os slots já expandidos da semana atual + o resumo byDay para o mês; navegação para fora da janela server-side mostra as views com base nos dados recebidos (não refaz fetch nesta iteração)."
  - "Exclusão de folga: schema Zod local { id: uuid } no próprio action (não há schema de delete em lib/schemas/availability.ts)."
metrics:
  duration_seconds: 389
  completed_date: 2026-07-21
  tasks_completed: 3
  files_created: 8
  files_modified: 2
status: complete
---

# Phase 06 Plan 03: Superfície da Agenda (actions + rota RSC + componentes client) Summary

Expõe a disponibilidade ao médico via 3 Server Actions com gate auth+paid+Zod, a rota RSC `/dashboard/agenda` que expande os slots server-side no fuso da clínica (janela default de semana), e 3 componentes client (editor de grade clicável, views Dia/Semana/Mês em CSS grid custom, dialog de folga) mais o item de sidebar — fecha AGENDA-01..04.

## What Was Built

**Task 1 — 3 actions + barrels** (`06b1351`)
- `saveAvailabilityRulesAction`, `createAvailabilityExceptionAction`, `deleteAvailabilityExceptionAction`, cada uma com `"use server"`, `getAuthenticatedUser` + gate `profile.status !== "paid"`, `safeParse` (mensagens PT-BR via `zodErrorToUserMessage`), delegação aos módulos do Plano 01 com `profile.id` stampado server-side, e `revalidatePath("/dashboard/agenda")` no caminho de sucesso.
- Barrel `actions/availability/index.ts` + re-export no `actions/index.ts` raiz.

**Task 2 — rota RSC + sidebar** (`d16b7d1`)
- `app/dashboard/agenda/page.tsx`: gate auth+paid (redirect), lê rules+exceptions em `Promise.all`, computa a janela default de SEMANA via `startOfWeek(new Date(), { in: tz(CLINIC_TIME_ZONE), weekStartsOn: 1 })` (meio-aberta `[weekStart, +7d)`), mapeia snake_case→camelCase, chama `expandAvailability`, serializa os `Date` para ISO e passa slots + byDay + rows cruas ao `AgendaView`.
- `components/app-sidebar.tsx`: novo grupo "Agenda" (ícone `CalendarIcon`) apontando para `/dashboard/agenda`.

**Task 3 — 3 componentes client** (`a32a834`)
- `availability-grid.tsx`: grade Seg→Dom × linhas de 30 min em CSS grid custom, click-to-toggle (D-01), bands derivadas das células contíguas (D-02), Select de duração por band (D-09, presets 10/15/20/30/45/60, default 30), range 06:00–22:00 auto-extensível, CTA "Salvar disponibilidade" via `saveAvailabilityRulesAction` + toasts sonner + empty state.
- `agenda-view.tsx`: Tabs Dia · Semana · Mês (default Semana, D-06); Dia/Semana em CSS grid custom com slots livres em `bg-primary/10` e marcador de hoje; Mês em grid Monday-first mostrando SÓ dot + "N livres" (D-07), nunca horários reais; navegação Anterior/Hoje/Próximo; empty states por view.
- `exception-dialog.tsx`: Dialog "Adicionar folga" com `components/ui/calendar.tsx` (react-day-picker, locale ptBR) SÓ como date-picker (D-08), toggle Dia inteiro/Período (D-04), lista de folgas (badge neutro "Folga", bg-muted) com `AlertDialog` de exclusão confirmada via `deleteAvailabilityExceptionAction`.

## Deviations from Plan

None - plan executed exactly as written. (Duas decisões de implementação registradas no frontmatter `decisions`: schema Zod local para o delete, e navegação client-side sobre os dados já expandidos.)

## Threat Mitigations Applied

- **T-06-05 (EoP, bypass paid):** gate `profile.status !== "paid"` em todos os 3 actions + redirect equivalente no RSC.
- **T-06-06 (Tampering input):** `safeParse` no boundary de cada action (schemas de `lib/schemas/availability.ts` + schema local uuid no delete).
- **T-06-07 (Info Disclosure cross-profile):** todas as leituras/escritas passam `profile.id` ao módulo; nenhuma leitura cross-profile; agenda owner-only.

## Verification

- `yarn typecheck`: limpo.
- `yarn eslint` nos arquivos tocados (actions/availability, app/dashboard/agenda/page.tsx, components/dashboard/agenda, components/app-sidebar.tsx, actions/index.ts): limpo.
- Grep de acceptance (gate paid, expandAvailability, weekStartsOn 1, CLINIC_TIME_ZONE, gridTemplate, saveAvailabilityRulesAction, ausência de react-big-calendar/@fullcalendar, ausência de hex): todos PASS.

## Deferred Issues

- `yarn lint` full falha com ~1490 erros pré-existentes fora do escopo (ds-bundle vendored, e um `addDays` não usado em `lib/expand-availability.ts` do Plano 06-02). Registrados em `deferred-items.md`. Nenhum causado por este plano.

## Known Stubs

Nenhum. Todos os componentes recebem dados reais: o editor lê as rules atuais, as views renderizam slots expandidos server-side, o dialog lista as exceptions reais. A navegação Dia/Semana/Mês opera sobre os dados já recebidos (ver decisão no frontmatter) — não é um stub de dados, e sim um escopo de fetch da janela atual.

## Follow-ups / Verificação Humana (UI)

Abrir `/dashboard/agenda` logado como perfil paid: pintar a grade e salvar; adicionar folga (dia inteiro e parcial) e conferir que os slots somem; alternar Dia/Semana/Mês e verificar as viradas (default Semana). Considerar, numa iteração futura, refazer a expansão server-side por janela ao navegar para fora da semana atual (searchParams + re-fetch).

## Self-Check: PASSED

Todos os 8 arquivos criados existem em disco; os 3 commits (06b1351, d16b7d1, a32a834) estão no histórico.
