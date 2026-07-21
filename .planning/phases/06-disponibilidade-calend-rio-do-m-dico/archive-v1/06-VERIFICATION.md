---
phase: 06-disponibilidade-calend-rio-do-m-dico
verified: 2026-07-21T00:00:00Z
status: human_needed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Logado como perfil paid, abrir /dashboard/agenda e pintar a grade semanal clicável, escolher duração por faixa e clicar em 'Salvar disponibilidade'."
    expected: "Toast 'Disponibilidade salva.'; ao recarregar, a grade reflete as faixas salvas (recorrência semana após semana)."
    why_human: "Interação de UI (click-to-toggle, derivação de bands, Select de duração) e render visual da grade CSS custom não são verificáveis por grep."
  - test: "Adicionar uma folga de dia inteiro numa data com disponibilidade e depois uma folga parcial (ex.: saída 16:00) noutra data."
    expected: "Os horários do dia inteiro somem por completo da grade; na folga parcial apenas os slots a partir da faixa bloqueada somem; a folga aparece na lista com badge neutro 'Folga'."
    why_human: "Confirmação visual de que a subtração aparece corretamente nas views renderizadas; a lógica pura já está provada por teste, mas o render depende de UI."
  - test: "Alternar as abas Dia / Semana / Mês (default Semana) e navegar Anterior/Hoje/Próximo, observando as viradas de dia/semana."
    expected: "Semana começa na segunda; nenhum slot duplicado ou sumido nas viradas; o mês mostra apenas dot + 'N livres' por dia, nunca horários reais; fuso America/Sao_Paulo."
    why_human: "Render visual das três views em CSS grid custom e navegação client-side; a correção de fuso/viradas da função pura já está provada por teste (13/13 verde sob TZ=UTC e TZ=America/New_York), mas o posicionamento visual dos slots na grade precisa de olho humano."
review_warnings_noted:
  - "WR-01: aritmética de slot DST-unsafe (addMinutes absoluto) — LATENTE, mascarada pelo fuso fixo America/Sao_Paulo (sem DST desde 2019); não afeta a fase, mas vira bug se o fuso mudar."
  - "WR-02: exception_date valida só com Date.parse (aceita formatos não-ISO/ambíguos) no boundary do action."
  - "WR-03: end_minute sem teto (>24h) no schema e no DB — regra/exceção pode exceder 24h e inflar freeSlotCount."
  - "WR-04: opção 24:00 (fim do dia) inalcançável na UI de folga parcial (TIME_OPTIONS 00:00–23:30); 'Dia inteiro' cobre o caso total, mas um slot 23:30 poderia sobrar num bloqueio parcial."
  - "WR-05: policies UPDATE não exercidas (delete-then-insert / só create+delete); double-scope do delete não coberto por teste automatizado."
---

# Phase 6: Disponibilidade & Calendário do Médico — Verification Report

**Phase Goal:** O médico configura sua disponibilidade recorrente uma vez e vê sua agenda corretamente em dia, semana e mês — a base de calendário sobre a qual tudo o mais é construído, sem nenhuma nova superfície externa de ataque.
**Verified:** 2026-07-21
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (mapped to ROADMAP Success Criteria)

| # | Truth (SC) | Status | Evidence |
| - | ---------- | ------ | -------- |
| 1 | Médico define disponibilidade recorrente por dia da semana e faixa que se repete sem recriar rows por slot | ✓ VERIFIED | `availability_rules` armazena regras (weekday, start/end_minute, slot_minutes), sem unique em (profile_id, weekday) → múltiplas faixas/dia (D-02). Nenhum slot materializado; `upsert-availability-rules.ts` faz delete-then-insert da grade inteira. Migração aplicada e viva (nota do orquestrador). |
| 2 | Médico define duração padrão do slot e vê horários livres gerados por função pura testável | ✓ VERIFIED | `slot_minutes` por faixa (D-09); `lib/expand-availability.ts` é função pura determinística (recebe window+timeZone por parâmetro, nunca lê `new Date()`/`process.env.TZ`). Suite `.spec` de 13 casos cobre D-09 (durações distintas) e D-10 (sobra descartada) — 13/13 verde. |
| 3 | Médico bloqueia exceção pontual por data e os horários daquele dia somem da grade | ✓ VERIFIED | `availability_exceptions` subtrativa com CHECK ambos-ou-nenhum (D-04). `expandAvailability`: exceção dia-inteiro remove o dia, parcial subtrai slots sobrepostos `[exStart,exEnd)`. Provado pelos testes D-04 (dia inteiro, parcial, parcial-sem-overlap) verdes. Comportamento de transição/subtração exercitado por teste. |
| 4 | Médico alterna dia/semana/mês e vê horários corretos nas viradas (meio-aberto, semana na segunda, America/Sao_Paulo) sem slot duplicado/sumido | ✓ VERIFIED (lógica) | Função pura: intervalos meio-abertos `< end`, `startOfWeek({weekStartsOn:1})` na page RSC, fuso via `{ in: tz(CLINIC_TIME_ZONE) }`. Testes D-11 (virada de semana, virada de dia em 00:00, fuso fixo) verdes idênticos sob `TZ=UTC` e `TZ=America/New_York` (13/13 nos dois). Render das 3 views → verificação humana. |

**Score:** 4/4 truths verified (0 present, behavior-unverified). A correção de viradas/fuso (SC-4) é comportamento de invariante e está exercitada por teste behavioral; o render visual das três views é a única parte não coberta por teste e vai para verificação humana.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `supabase/migrations/20260721000100_availability_rules.sql` | Tabela + RLS + 4 policies + CHECKs | ✓ VERIFIED | Table, `enable row level security`, 4 policies owner-scoped, CHECKs (weekday 0-6, end>start, %30, slot>0), sem unique (profile_id,weekday), índice. Aplicada à DB viva. |
| `supabase/migrations/20260721000200_availability_exceptions.sql` | Tabela + RLS + 4 policies + CHECK nullability | ✓ VERIFIED | Table, RLS, 4 policies, CHECK `(start is null)=(end is null)`, sem FK de consulta. Aplicada à DB viva. |
| `lib/expand-availability.ts` | Função pura regras→slots + byDay | ✓ VERIFIED | Pura, determinística, `{ in: tz(timeZone) }`, meio-aberto, D-04/09/10/11. |
| `lib/expand-availability.spec.ts` | Suite de casos de borda | ✓ VERIFIED | 13 testes; 13/13 verde sob TZ=UTC e TZ=America/New_York. |
| `lib/clinic-timezone.ts` | CLINIC_TIME_ZONE constante | ✓ VERIFIED | `export const CLINIC_TIME_ZONE = "America/Sao_Paulo"`. |
| `lib/schemas/availability.ts` | 3 schemas Zod PT-BR | ✓ VERIFIED | availabilityRuleSchema, saveAvailabilityRulesSchema, createAvailabilityExceptionSchema + z.infer. |
| `modules/availability/*` (6 arquivos) | CRUD escopado por profile_id | ✓ VERIFIED | 6 módulos, todos `.eq("profile_id")` (create/insert stampa server-side), throw `[AVAILABILITY]`, sem next/cache|next/headers. |
| `actions/availability/*` (4 arquivos) | 3 actions gate+Zod + barrel | ✓ VERIFIED | Cada action: getAuthenticatedUser + `!== "paid"` + safeParse + delega + revalidatePath + result union. Barrel + actions/index.ts. |
| `app/dashboard/agenda/page.tsx` | RSC expande slots server-side | ✓ VERIFIED | Gate auth+paid redirect; Promise.all reads; expandAvailability janela SEMANA; serializa ISO; passa a AgendaView. |
| `components/dashboard/agenda/agenda-view.tsx` | Views dia/semana/mês CSS grid | ✓ VERIFIED | Tabs default Semana; gridTemplate custom; mês = dot + contagem; sem lib de calendário. |
| `components/dashboard/agenda/availability-grid.tsx` | Editor clicável + duração + salvar | ✓ VERIFIED | gridTemplate, click-to-toggle, Select duração, `saveAvailabilityRulesAction`, sonner. |
| `components/dashboard/agenda/exception-dialog.tsx` | Dialog folga + toggle + exclusão | ✓ VERIFIED | ui/calendar como date-picker; toggle Dia inteiro/Período; create/delete actions; AlertDialog. |
| `components/app-sidebar.tsx` | Item Agenda | ✓ VERIFIED | `{ title: "Agenda", url: "/dashboard/agenda" }` + CalendarIcon. |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| page.tsx (RSC) | expandAvailability | mapeia rows → chama fn → serializa → AgendaView | ✓ WIRED |
| page.tsx | modules (list rules/exceptions) | Promise.all escopado por profile.id | ✓ WIRED |
| availability-grid.tsx | saveAvailabilityRulesAction | onClick handleSave → action → toast | ✓ WIRED |
| exception-dialog.tsx | create/deleteAvailabilityExceptionAction | submit + AlertDialog confirm | ✓ WIRED |
| actions/availability | actions/index.ts (barrel) | re-export bloco availability | ✓ WIRED |
| actions | modules (upsert/create/delete) | profile.id stampado server-side + revalidatePath | ✓ WIRED |
| sidebar | /dashboard/agenda | navMain item | ✓ WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Expansão pura correta (D-02/04/07/09/10/11) | `TZ=UTC npx tsx --test lib/expand-availability.spec.ts` | 13/13 pass | ✓ PASS |
| Independência de fuso (SC-4) | `TZ=America/New_York npx tsx --test lib/expand-availability.spec.ts` | 13/13 pass | ✓ PASS |
| Compilação de tipos | `yarn typecheck` | Done, sem erros | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| AGENDA-01 | 06-01, 06-03 | Disponibilidade recorrente por dia/faixa | ✓ SATISFIED | Tabela availability_rules + editor de grade + saveAction (SC-1). |
| AGENDA-02 | 06-02, 06-03 | Duração do slot + horários gerados na leitura | ✓ SATISFIED | slot_minutes/faixa + expandAvailability testável (SC-2). |
| AGENDA-03 | 06-01, 06-03 | Exceções pontuais que removem horários | ✓ SATISFIED | availability_exceptions + subtração testada + exception-dialog (SC-3). |
| AGENDA-04 | 06-02, 06-03 | Views dia/semana/mês corretas nas viradas/fuso | ✓ SATISFIED (lógica) / ⧗ UI human | Lógica de viradas/fuso provada por teste; render das views → verificação humana. |

Todos os 4 IDs (AGENDA-01..04) constam em REQUIREMENTS.md mapeados à Phase 6, e todos são reivindicados por pelo menos um PLAN. Nenhum requisito órfão.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
| ---- | ------- | -------- | ------ |
| — | Nenhum debt marker (TBD/FIXME/XXX), stub, placeholder ou return-null em arquivos da fase | ℹ️ Info | Nenhum |

Os itens WR-01..WR-05 do 06-REVIEW são gaps de robustez/correção latente (nenhum BLOCKER); registrados em `review_warnings_noted` no frontmatter. Todos confirmados presentes no código, nenhum impede o goal para o fuso fixo America/Sao_Paulo.

### Human Verification Required

Ver a seção `human_verification` no frontmatter — 3 itens de UI (salvar grade, subtração de folga nas views, alternância dia/semana/mês). A lógica pura por trás de cada um já está provada por teste; o que resta é confirmação visual do render em CSS grid custom.

### Gaps Summary

Nenhum gap bloqueante. As 4 Success Criteria estão satisfeitas na base de código: persistência recorrente sem row-por-slot, expansão pura testável, subtração de exceções e correção de viradas/fuso — esta última provada por 13/13 testes verdes idênticos sob dois fusos de processo distintos. `yarn typecheck` limpo. Zero nova superfície externa (owner-only, gate paid em todo action e no RSC, RLS + `.eq(profile_id)` em defense-in-depth).

O status é `human_needed` porque a renderização visual das três views (dia/semana/mês) e a interatividade do editor de grade não são verificáveis por grep/teste — são itens genuínos de UI. As 5 WARNINGs do code review (WR-01 DST latente, WR-02 validação de data frouxa, WR-03 end_minute sem teto, WR-04 24:00 inalcançável na UI parcial, WR-05 policies UPDATE mortas / delete double-scope sem teste) ficam registradas para uma iteração futura; nenhuma bloqueia o goal desta fase.

---

_Verified: 2026-07-21_
_Verifier: Claude (gsd-verifier)_
