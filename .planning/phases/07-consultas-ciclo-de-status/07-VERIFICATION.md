---
phase: 07-consultas-ciclo-de-status
verified: 2026-07-25T00:00:00Z
status: passed
score: 4/4 must-have truths verified — banco live confirmado via Supabase MCP (constraint aplicada + smoke 23P01) e distinção visual confirmada pelo usuário (ver 07-UAT.md)
human_verification_resolved: "Itens 1-2 verificados no banco live via Supabase MCP em 2026-07-25 (exclusion constraint parcial pending+confirmed ativa; smoke transacional disparou SQLSTATE=23P01 com rollback total). Item 3 (distinção visual) confirmado pelo usuário."
behavior_unverified: 0
overrides_applied: 0
requirements_verified: [APPT-01, APPT-02, APPT-03, APPT-04]
human_verification:
  - test: "Confirmar que a migration 20260722200000_appointments.sql está APLICADA no Supabase live (enum 5 valores, tabela appointments, RLS + 4 policies, extensão btree_gist, exclusion constraint appointments_no_double_booking com predicado parcial pending+confirmed, patient_id ON DELETE RESTRICT)."
    expected: "select conname, pg_get_constraintdef(oid) from pg_constraint where conname='appointments_no_double_booking' retorna EXCLUDE USING gist (...) WHERE status in ('pending','confirmed'); enum tem exatamente {pending,confirmed,done,no_show,canceled}; 4 policies; btree_gist em pg_extension."
    why_human: "A verificação do ESTADO LIVE do banco exige acesso ao Supabase MCP/console — não é observável a partir do código-fonte. O arquivo de migration está correto e completo, mas o verificador não pode confirmar programaticamente que ela foi de fato pushada (build/typecheck passam sem a migration aplicada — falso-positivo conhecido, ver 07-01-PLAN Task 3)."
  - test: "Smoke de double-booking no banco live: inserir duas consultas pending/confirmed sobrepostas para o mesmo profile_id."
    expected: "A segunda falha com SQLSTATE 23P01; via createAppointmentAction a UI mostra 'Este horário já foi ocupado por outra consulta. Escolha outro horário livre.' — nunca o erro cru."
    why_human: "Exige rodar o app contra o banco live e provocar a corrida; o mapeamento 23P01→copy está no código (verificado), mas o disparo real do 23P01 depende da constraint estar ativa no banco."
  - test: "Distinção visual dos 5 status na grade live (calendar-time-grid.tsx) em tamanho de célula real: pendente (borda tracejada/menta) ≠ confirmada (sólida), falta (UserX) ≠ cancelada (hachura + nome riscado), realizada (muted)."
    expected: "As 4 distinções (SC-2 falta≠cancelada, SC-3 pendente≠confirmada) são inconfundíveis a olho na paleta pastel do redesign agenda-híbrida."
    why_human: "Legibilidade/contraste visual em tamanho real é julgamento humano; o contrato de estilo existe e é consumido pela grade viva, mas a percepção não é verificável por grep."
---

# Fase 07: Consultas & Ciclo de Status — Relatório de Verificação

**Meta da fase:** O médico cria consultas em horários livres, conduz cada uma pelo ciclo de status completo, e o banco garante que dois pacientes nunca ocupem o mesmo horário — estabelecendo o alvo de FK e a exclusion constraint na qual a fase de assentos vai escrever.

**Verificado:** 2026-07-25
**Status:** human_needed
**Re-verificação:** Não — verificação inicial

## Nota metodológica

A implementação da Fase 07 foi posteriormente **estendida** pelo redesign "agenda-híbrida" (tarefas quick no branch `redesign/agenda-hibrida`): a rota de renderização de status agora vive em `calendar-time-grid.tsx` + `appointment-status-style.ts` (compartilhados), e `calendar-day-week-grid.tsx` é código morto para renderização. Colunas `type`/`reason` e um seletor de duração foram adicionados (migration `20260724210000_appointment_reason_type.sql`; reverte D-01). O `AppointmentCreateDialog` (07-03) foi superado pelo `BookingRail` como caminho primário de criação, mas **ambos chamam a mesma `createAppointmentAction`** — a criação continua viva. Toda a verificação abaixo foi feita contra a **rota viva**, não contra o código do 07-03 substituído.

## Conquista da Meta

### Verdades observáveis (Success Criteria do ROADMAP)

| # | Verdade (SC) | Status | Evidência |
| - | ------------ | ------ | --------- |
| 1 | O médico cria/edita consulta em horário livre, ligada a paciente já cadastrado (reusa `patients`) | ✓ VERIFIED | `createAppointmentAction` (actions/appointments/create-appointment.ts:53) valida slot livre server-side via `expandAvailability` (mapeando snake→camel, l.92-104) e estampa `profile_id` server-side; criação viva por `booking-rail.tsx:145` e `appointment-create-dialog.tsx:171`; busca de paciente reusa o domínio `patients` (agenda-side-panel passa `patients` ao BookingRail). Nasce `status:"confirmed"` (D-05, create-appointment.ts:156). |
| 2 | Ciclo solicitada→confirmada→realizada/falta/cancelada, com falta distinta de cancelada e visível como tal | ✓ VERIFIED | Máquina pura `isLegalTransition`/`APPOINTMENT_TRANSITIONS` (appointment-transitions.ts:16-36) impõe o ciclo; spec 5/5 passa (`no_show`≠`canceled` como estados finais distintos). Render vivo: `APPOINTMENT_STATUS_STYLE` (appointment-status-style.ts:66-116) dá a `no_show` UserX/`agenda-st-no_show` e a `canceled` CalendarX + `strike:true` + `hatch:true` — tratamentos distintos consumidos por `calendar-time-grid.tsx:366-418`. |
| 3 | Médico confirma/recusa "pedido a confirmar" a partir da agenda; pendente distinta de confirmada | ✓ VERIFIED | `appointment-detail-menu.tsx` (hospedado por calendar-editor.tsx:1508) abre em qualquer célula: pendente → Confirmar (l.276-278, pending→confirmed) / Recusar (l.296-299, pending→canceled) via `transitionAppointmentStatusAction`. Distinção pendente (`border-dashed agenda-st-pending`) ≠ confirmada (`agenda-st-confirmed`) no contrato de estilo. |
| 4 | Horário com consulta pendente OU confirmada rejeita segunda consulta no banco (exclusion btree_gist por profile_id sobre pending+confirmed); 23P01 vira result union amigável | ⚠️ código VERIFIED / banco live pende humano | Migration define a constraint exata: `exclude using gist (profile_id with =, tstzrange(starts_at, ends_at, '[)') with &&) where (status in ('pending','confirmed'))` (migration l.52-57); btree_gist antes da tabela (l.14<34). Módulo preserva `error.code` (create-appointment.ts:59) e ambos os actions mapeiam 23P01 → "Este horário já foi ocupado…" (create l.165-169, update l.76-80). **Aplicação da migration ao banco live não é verificável por código** → item humano. |

**Score:** 4/4 verdades verificadas no código; a garantia de banco (SC-4) tem o SQL correto porém depende de confirmação humana de que a migration está aplicada no Supabase live.

### Artefatos exigidos

| Artefato | Esperado | Status | Detalhes |
| -------- | -------- | ------ | -------- |
| `supabase/migrations/20260722200000_appointments.sql` | enum+tabela+RLS(4)+btree_gist+exclusion parcial | ✓ VERIFIED | 4 policies, btree_gist antes da tabela, exclusion `[)` por profile_id sobre pending+confirmed, patient_id RESTRICT, profile_id CASCADE, sem RPC — todos os acceptance grep OK. |
| `modules/appointments/appointment-transitions.ts` (+ .spec) | máquina de estado pura | ✓ VERIFIED | Ciclo legal correto; 3 estados finais → `[]`; spec 5/5 passa. |
| `lib/schemas/appointment.ts` | Zod create/update + refine | ✓ VERIFIED | `createAppointmentSchema` (refine ends>starts), `updateAppointmentStatusSchema`; estendido com `type`/`reason`. |
| `modules/appointments/create-appointment.ts` | insert + preserva error.code | ✓ VERIFIED | `code = error.code` (l.59); profile_id estampado server-side. |
| `modules/appointments/update-appointment-status.ts` | compare-and-set + double .eq | ✓ VERIFIED | `.eq("profile_id").eq("id").eq("status", from)`; distingue matched:false; preserva error.code. |
| `modules/appointments/list-appointments-by-profile-id.ts` | leitura janelada, escopada, todos os status | ✓ VERIFIED | `.eq("profile_id").gte/.lt("starts_at").order`; traz todos os status (D-07). |
| `actions/appointments/create-appointment.ts` | gate+Zod+slot-free+23P01→copy | ✓ VERIFIED | auth+paid, safeParse, slot-free via expandAvailability, future-guard, 23P01→copy, revalidatePath. |
| `actions/appointments/update-appointment-status.ts` | gate+isLegalTransition+CAS miss+23P01 | ✓ VERIFIED | `transitionAppointmentStatusAction`: isLegalTransition, matched:false→copy, 23P01→copy. |
| `components/dashboard/agenda/appointment-status-style.ts` | contrato visual dos 5 status | ✓ VERIFIED | Consumido pela rota viva (grid + detail menu). |
| `components/dashboard/agenda/calendar-time-grid.tsx` (rota viva) | render dos 5 status + clique-cria/detalhe | ✓ VERIFIED | Renderiza blocos por status; clique em slot livre+futuro → criar, clique em consulta → detalhe. |
| `components/dashboard/agenda/appointment-detail-menu.tsx` | transições legais + finais read-only | ✓ VERIFIED | pending→Confirmar/Recusar; confirmed→realizada/falta/cancelar; final→"Consulta finalizada — sem outras ações." |
| `app/dashboard/agenda/page.tsx` | carga paralela de consultas + erro | ✓ VERIFIED | `listAppointmentsByProfileId` no Promise.all, `appointmentsLoadError`, passa `appointments=` ao CalendarEditor. |

### Verificação dos elos-chave (wiring)

| De | Para | Via | Status |
| -- | ---- | --- | ------ |
| page.tsx | listAppointmentsByProfileId | Promise.all + prop `appointments=` | ✓ WIRED |
| calendar-editor | CalendarTimeGrid | mapeia rows→PositionedAppointment por status (l.556-599) | ✓ WIRED (rota viva) |
| calendar-editor | AppointmentDetailMenu | hospedado (l.1508); abre em qualquer célula | ✓ WIRED |
| booking-rail / create-dialog | createAppointmentAction | criação viva | ✓ WIRED |
| detail-menu / pending-panel | transitionAppointmentStatusAction | confirmar/recusar/realizada/falta/cancelar | ✓ WIRED (detail-menu vivo) |
| módulo create | action | error.code(23P01) preservado → branch por SQLSTATE | ✓ WIRED |
| action | copy PT-BR | 23P01 → "horário já ocupado" (nunca erro cru) | ✓ WIRED |

### Observação de código morto (não-bloqueante)

- `components/dashboard/agenda/pending-requests-panel.tsx` **existe e está corretamente cabeado** (`transitionAppointmentStatusAction`, Confirmar/Recusar, AlertDialog, empty state) mas **NÃO está hospedado** em nenhuma tela viva — só referenciado em comentários. Isso NÃO bloqueia o SC-3: o confirmar/recusar de pedidos pendentes está vivo pela outra rota exigida pelo SC ("a partir da agenda") — o `AppointmentDetailMenu` abre na célula do pedido pendente e oferece Confirmar/Recusar. O SC-3 pede "a partir da agenda / lista de solicitações"; a agenda (detail menu) satisfaz. A "lista de solicitações" dedicada ficou órfã no redesign — ℹ️ Info, candidata a limpeza ou re-hospedagem, não gap de meta.
- `components/dashboard/agenda/appointment-create-dialog.tsx` idem: existe e cabeado, mas superado pelo `BookingRail` como caminho primário; ambos usam a mesma action. Criação viva. ℹ️ Info.

### Cobertura de requisitos

| Requisito | Descrição | Status | Evidência |
| --------- | --------- | ------ | --------- |
| APPT-01 | Cria/edita consulta em horário livre ligada a paciente cadastrado | ✓ SATISFIED | createAppointmentAction + BookingRail + reuso de patients |
| APPT-02 | Ciclo de status com falta≠cancelada | ✓ SATISFIED | isLegalTransition + APPOINTMENT_STATUS_STYLE (no_show≠canceled) |
| APPT-03 | Confirma/recusa pedido a confirmar | ✓ SATISFIED | detail-menu pending→Confirmar/Recusar (vivo) |
| APPT-04 | Não-double-booking garantido no banco (exclusion por profile_id) | ⚠️ SQL correto; banco live pende humano | migration l.52-57 + mapeamento 23P01 nos actions |

Todos os 4 IDs do PLAN estão contabilizados; nenhum órfão (REQUIREMENTS.md mapeia APPT-01..04 → Phase 7).

### Spec de transições (behavioral)

| Comportamento | Comando | Resultado | Status |
| ------------- | ------- | --------- | ------ |
| Máquina de transições impõe o ciclo legal + estados finais | `yarn tsx --test modules/appointments/appointment-transitions.spec.ts` | 5 pass / 0 fail | ✓ PASS |
| Typecheck do projeto (módulos+actions+UI alinhados) | `yarn typecheck` | limpo | ✓ PASS |
| Migration acceptance (grep) | 4 policies, btree_gist<table, exclude `[)`, predicado parcial, restrict, sem RPC | todos OK | ✓ PASS |

### Anti-padrões encontrados

Nenhum. Varredura de `TBD/FIXME/XXX/HACK/PLACEHOLDER/TODO` nos arquivos da fase: limpa (o único match "TODOS" é a palavra portuguesa "todos" num comentário, não um marcador de débito).

### Verificação humana necessária

Ver o bloco `human_verification` no frontmatter. Em resumo:
1. **Estado live do banco** — confirmar que a migration está aplicada (enum, tabela, RLS+4 policies, btree_gist, exclusion constraint parcial, patient_id RESTRICT). Não observável por código; o SQL está correto e completo.
2. **Smoke 23P01** — provocar double-booking real e confirmar a copy amigável (nunca erro cru).
3. **Distinção visual dos 5 status** em tamanho real (SC-2 falta≠cancelada, SC-3 pendente≠confirmada) na paleta pastel do redesign.

### Resumo de gaps

Sem gaps bloqueantes. Todas as verdades observáveis estão implementadas e cabeadas na rota viva; a máquina de estado é testada e passa; a migration SQL satisfaz integralmente o contrato da exclusion constraint. O status é **human_needed** (não `passed`) por dois motivos legítimos e não-programáticos: (a) a garantia de banco da SC-4 só é confirmável executando contra o Supabase live, e (b) as distinções visuais SC-2/SC-3 exigem olhos humanos no tamanho real da célula — ambos previstos como checkpoints [BLOCKING] nos planos 07-01 e 07-03. Dois componentes órfãos (pending-requests-panel, appointment-create-dialog) são consequência do redesign agenda-híbrida e não afetam a meta (as capacidades vivem em rotas vivas equivalentes).

---

_Verificado: 2026-07-25_
_Verificador: Claude (gsd-verifier)_
