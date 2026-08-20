---
phase: quick-260724-ojm
plan: 01
subsystem: agenda
tags: [agenda, appointments, ui, next-navigation]
status: complete
requires:
  - createAppointmentAction / transitionAppointmentStatusAction (já revalidam o cache)
provides:
  - Agenda reflete criação e transição de consulta sem reload manual
affects:
  - components/dashboard/agenda/calendar-editor.tsx
  - components/dashboard/agenda/appointment-detail-menu.tsx
tech-stack:
  patterns:
    - "router.refresh() do next/navigation para re-renderizar o RSC após server action"
key-files:
  created: []
  modified:
    - components/dashboard/agenda/calendar-editor.tsx
    - components/dashboard/agenda/appointment-detail-menu.tsx
decisions:
  - "Correção puramente no cliente: as actions já chamam revalidatePath; faltava o router.refresh() para o RSC re-renderizar sem reload"
metrics:
  duration: ~3 min
  completed: 2026-07-24
requirements: [OJM-01]
---

# Quick 260724-ojm: Corrigir agenda não atualizar após criar/transicionar consulta — Summary

Agenda agora reflete a criação de consulta e a transição de status imediatamente na grade, sem reload manual, via `router.refresh()` após cada action.

## O que foi feito

As server actions (`createAppointmentAction`, `transitionAppointmentStatusAction`) já invalidam o cache do servidor com `revalidatePath("/dashboard/agenda")`, mas os client components as invocavam apenas com `await` — o cache era invalidado porém o RSC da página atual não re-renderizava no cliente. A correção dispara `router.refresh()` após cada ação bem-sucedida.

### `components/dashboard/agenda/calendar-editor.tsx`
- Import de `useRouter` de `next/navigation`.
- `const router = useRouter()` no componente.
- `onCreated` do `AgendaSidePanel`: mantém `setDrawerOpen(false)` e adiciona `router.refresh()`.
- `<AppointmentDetailMenu />`: nova prop `onChanged={() => router.refresh()}` (props existentes intactas).

### `components/dashboard/agenda/appointment-detail-menu.tsx`
- Prop opcional `onChanged?: () => void` adicionada ao tipo e desestruturada na assinatura.
- Em `runTransition`, no ramo `if (result.ok)`, após `toast.success(...)` e `onOpenChange(false)`, invoca `onChanged?.()`.
- `onChanged` incluído nas dependências do `useCallback`.

## Verificação

- `yarn typecheck` passa sem erros.
- Nenhum arquivo fora dos dois client components foi alterado.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- FOUND: components/dashboard/agenda/calendar-editor.tsx
- FOUND: components/dashboard/agenda/appointment-detail-menu.tsx
- FOUND commit: b686a81

## Commit

- `b686a81` fix(quick-260724-ojm): agenda reflete criação/transição de consulta na hora (router.refresh)
