# Quick Task 260724-f3j: Agenda — cores do fundo, drawer fecha, tag do dia, 1 botão, pedidos na grade — Context

**Gathered:** 2026-07-24
**Status:** Ready for planning
**Branch:** `redesign/agenda-hibrida` (continua du8 + kej + m6r + cfl)

<domain>
## Task Boundary

Lote de refinamentos de UI na Agenda (Fase 7), mesma branch. CAMADA DE UI apenas — backend/actions/expand/RSC (app/dashboard/agenda/page.tsx) inalterados. Editar `app/globals.css` é PERMITIDO (só estilo/tokens de cor).
</domain>

<decisions>
## Implementation Decisions (LOCKED)

- **E-1 (cores do fundo da grade):** A cor de FUNDO das células de disponibilidade muda:
  - **Disponível (livre) = VERDE.** ⚠️ Verde NÃO existe nos tokens Falaped (azul/cinza/vermelho). Introduzir um verde NOVO em **oklch** (nunca hex/rgb), centralizado como variável CSS em `app/globals.css` (ex.: `--calendar-available` fundo verde claro + `--calendar-available-foreground`/borda verde mais forte). Desvio consciente da regra "só tokens", autorizado pelo usuário.
  - **Folga = cinza** (reusar `--muted`/`bg-muted` existente).
  - **Vazio (sem disponibilidade) = branco** (`--background`/branco).
  Aplicar coerente em Dia/Semana (grade de tempo) e no indicador do Mês. Os 5 STATUS de consulta (pendente azul-tracejado, confirmada azul-sólido, realizada cinza, falta vermelho, cancelada cinza-hachura) PERMANECEM inalterados — E-1 é só o fundo de disponibilidade/folga/vazio.
- **E-2 (drawer fecha ao executar ação):** Após executar QUALQUER ação, fechar o drawer (`setDrawerOpen(false)`):
  - criar consulta com sucesso (BookingRail) → fecha;
  - aplicar disponibilidade → fecha;
  - aplicar folga → fecha.
  O toast de sucesso continua (com "Desfazer" para disponibilidade/folga). Em erro, NÃO fecha (mantém o drawer com o erro inline).
- **E-3 (dia selecionado — só o header + tag):** APENAS o cabeçalho do dia selecionado fica marcado. REMOVER qualquer realce que pinte além do header (a "aba ativa" do cfl que colore fundo da coluna/células — reduzir ao header). Adicionar uma **TAG/badge "Selecionado"** no cabeçalho do dia escolhido (usar `Badge` de components/ui). Distinto do "hoje" (número em bolinha). Sem realce na coluna/células.
- **E-4 (1 botão único de ações):** SUBSTITUIR os 2 botões do cfl ("+ Nova consulta" e "Disponibilidade") por UM ÚNICO botão que abre o drawer com as ações. Dentro do drawer, um toggle de 3 opções **Consulta | Disponibilidade | Folga** escolhe a ação: Consulta = BookingRail; Disponibilidade = AvailabilityPanel com tipo=disponibilidade; Folga = AvailabilityPanel com tipo=folga (o toggle externo do painel define o tipo). Slot livre continua abrindo o drawer em Consulta com horário pré-marcado (C-4 do cfl). Label do botão: discricionário, PT-BR (ex.: "+ Nova marcação" ou "Ações da agenda").
- **E-5 (pedidos pendentes na grade, sem seção):** REMOVER a seção/painel "Pedidos a confirmar" (`PendingRequestsPanel`) e seus estados/props órfãos. Os pedidos pendentes JÁ aparecem como blocos "pendente" na grade (tracejado azul + Clock) — isso É a sinalização. GARANTIR que o menu de detalhe de um bloco PENDENTE ofereça **Confirmar** (pending→confirmed) e **Recusar** (pending→canceled) via `transitionAppointmentStatusAction` (o `AppointmentDetailMenu` deve cobrir o status pendente). Opcional leve: reforçar o sinal do bloco pendente, mas sem nova seção.

### Claude's Discretion
- Valores oklch exatos do verde (fundo claro legível + borda/acento) e se vira `--calendar-available*` no globals.css ou classes utilitárias oklch consistentes. Preferir variável CSS centralizada.
- Label/ícone do botão único; forma do toggle de 3 opções (segmented) dentro do drawer.
- Forma exata da tag "Selecionado" (Badge pequeno no header).
- Como o menu de detalhe do bloco pendente lista Confirmar/Recusar (reusar o mapeamento de transições legais já existente).
</decisions>

<canonical_refs>
## Canonical References

- `app/globals.css` — adicionar o verde de disponibilidade (oklch, sem hex/rgb). PERMITIDO editar.
- `components/dashboard/agenda/calendar-time-grid.tsx` — fundo das células (available→verde, off→cinza, vazio→branco, E-1); header do dia: reduzir realce ao header + tag "Selecionado" (E-3).
- `components/dashboard/agenda/calendar-month-indicator.tsx` — cores coerentes (E-1) + seleção só no header/célula com tag (E-3).
- `components/dashboard/agenda/appointment-status-style.ts` — NÃO mudar os 5 status; conferir que o verde de disponibilidade é do FUNDO, não dos status.
- `components/dashboard/agenda/calendar-editor.tsx` — 1 botão único abrindo o drawer (E-4); drawer fecha após ação (E-2); remover `PendingRequestsPanel` e órfãos (E-5); slot-click segue abrindo drawer Consulta pré-marcado.
- `components/dashboard/agenda/agenda-side-panel.tsx` — toggle de 3 opções Consulta|Disponibilidade|Folga (E-4); recebe/propaga o modo inicial e o "fechar ao aplicar".
- `components/dashboard/agenda/availability-panel.tsx` — tipo (disponibilidade/folga) pode vir pré-selecionado pelo toggle externo; `onApply` deve sinalizar sucesso p/ o editor fechar o drawer (E-2).
- `components/dashboard/agenda/booking-rail.tsx` — `onCreated` deve fechar o drawer (E-2).
- `components/dashboard/agenda/appointment-detail-menu.tsx` — garantir Confirmar/Recusar para bloco pendente (E-5).
- `components/dashboard/agenda/pending-requests-panel.tsx` — deixa de ser renderizado (E-5); pode manter o arquivo sem uso.
- `components/ui/badge.tsx` — Badge para a tag (E-3).
- NÃO alterar: lib/**, actions/**, modules/**, supabase/migrations/**, app/dashboard/agenda/page.tsx.
</canonical_refs>
