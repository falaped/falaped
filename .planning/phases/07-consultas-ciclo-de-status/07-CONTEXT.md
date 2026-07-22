# Phase 7: Consultas & Ciclo de Status - Context

**Gathered:** 2026-07-22
**Status:** Ready for planning

<domain>
## Phase Boundary

O médico cria consultas em horários livres da sua agenda (expandida na Fase 6), ligadas a um paciente já cadastrado, e conduz cada consulta pelo ciclo de status **solicitada (pedido a confirmar) → confirmada → realizada / falta / cancelada**. O banco garante que dois pacientes nunca ocupem o mesmo horário via **exclusion constraint** escopada por `profile_id` sobre os status que "seguram" o horário (pendente + confirmada). Estabelece o alvo de FK (consulta) e a exclusion constraint sobre os quais a Fase 8/9 (assento da assistente) vai escrever.

**Entrega esta fase (APPT-01..04):** tabela de consultas owner-scoped ligada a `patients`, ciclo de status com transições, criação a partir de um slot livre no calendário, confirmação/recusa de pedidos, distinção visual pendente/confirmada/falta/cancelada na agenda, e não-double-booking garantido no banco (result union amigável, nunca 23P01 cru).

**NÃO entrega (fases seguintes / fora de escopo):**
- Assento delegado / login da assistente / UI de agendamento da assistente → **Phase 8/9** (SEAT-*).
- Livro-caixa de ganhos ligado à consulta → **Phase 10** (EARN-*).
- Notificações (WhatsApp/e-mail) de agendamento → fora do milestone.
- Nenhuma nova superfície externa não-autenticada nesta fase (a assistente entra na Fase 8+).

</domain>

<decisions>
## Implementation Decisions

### Duração & vínculo com o horário livre
- **D-01:** A consulta ocupa **exatamente 1 slot** da grade — a duração vem do `slot_minutes` da faixa expandida (Fase 6, D-09). NÃO há duração livre nesta fase.
- **D-02:** A consulta **só pode ser criada num slot livre** expandido (dentro da disponibilidade recorrente/aditiva, e não bloqueado por folga). Sem "forçar" horário fora da disponibilidade nesta fase.

### Fluxo de criação (na agenda)
- **D-03:** Criação a partir do **calendário da Fase 6**: clicar num **slot livre** abre um **dialog** para buscar/escolher um paciente já cadastrado e criar a consulta. É o caminho primário (não um form separado).
- **D-04:** A escolha do paciente **reusa o domínio `patients` existente** (busca escopada por `profile_id`; ex.: `find-patient-by-profile-id-name-responsible`, `get-patients-by-profile-id`). Não criar cadastro de paciente aqui — só selecionar existente (criação mínima de paciente é escopo da Fase 9/assistente).

### Status inicial & transições
- **D-05:** Ao **o médico** criar, a consulta nasce **Confirmada** direto. O fluxo "pedido a confirmar" (pendente) é a entrada da assistente (Fase 9), mas o médico **já consegue confirmar/recusar** pedidos pendentes existentes nesta fase (APPT-03) — a UI de lista/ação de pedidos existe.
- **D-06:** Ciclo: `solicitada (pending) → confirmada → realizada | falta | cancelada`. **Recusar** um pedido = **Cancelada** (libera o horário). `realizada`, `falta`, `cancelada` são **estados finais** (não reabrem nesta fase). `falta` é **distinta** de `cancelada` (visível como tal na agenda).
- **D-07:** Apenas **pendente + confirmada "seguram" o horário** (entram na exclusion constraint). `realizada`/`falta`/`cancelada` NÃO seguram — o horário fica livre para re-marcar, mas a consulta histórica continua visível na agenda.

### Não-double-booking (garantia no banco)
- **D-08:** Exclusion constraint **no banco**, escopada por `profile_id`, sobre o intervalo de tempo da consulta, ativa apenas quando `status in ('pending','confirmed')` — "pendente segura o horário" (roadmap SC-4). A violação (23P01) é capturada no action e vira um **result union amigável** ("horário já ocupado"), nunca erro cru. Forma exata (btree_gist + tstzrange vs. range de minutos + data; predicado parcial) fica a critério do research/planner (ver canonical_refs — é greenfield no repo).

### Travado pelo roadmap / projeto (não re-discutido)
- **D-09:** Owner-scoped por `profile_id` + RLS habilitada + policies na mesma migration (padrão do repo, molde `patient_vaccine_doses` / `availability_*`). Três camadas `app/ → actions/ → modules/`, uma fn por arquivo, `SupabaseClient` injetado, `[APPOINTMENTS]` (ou tag do domínio) error tag, gate `profile.status === "paid"` em actions e no RSC.
- **D-10:** Fuso fixo **America/Sao_Paulo**, intervalos meio-abertos, semana na segunda — herdado da Fase 6; a consulta se ancora nos mesmos slots expandidos por `expandAvailability`.
- **D-11:** FK forward: a consulta referencia `patients(id)` (e `profile_id`). A Fase 8/9 escreverá POR CIMA (assistente cria pedidos); não adicionar colunas de assento/membership aqui.

### Claude's / planner's discretion
- Nome exato da tabela/colunas de consulta (`appointments`?), forma do status (pg enum vs. text+CHECK — o repo usa ambos; enum é o padrão recente).
- Implementação exata da exclusion constraint (extensão `btree_gist`, tipo do range, predicado parcial por status) e como o timestamp/instante da consulta é derivado do slot (data + minuto no fuso da clínica).
- Como as consultas são renderizadas sobre os slots no calendário da Fase 6 (cor/legenda por status) e onde vive a "lista de pedidos a confirmar".
- Mapeamento do 23P01 → mensagem PT-BR no action.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo & requisitos desta fase
- `.planning/ROADMAP.md` § "Phase 7: Consultas & Ciclo de Status" — Goal, Success Criteria 1..4. **Fonte da verdade do escopo.**
- `.planning/REQUIREMENTS.md` — APPT-01, APPT-02, APPT-03, APPT-04 (texto integral).
- `.planning/PROJECT.md` § Key Decisions — "agendamentos entram como pedido a confirmar; o médico confirma antes de firmar o horário".

### Dependência: Fase 6 (agenda/slots) — a consulta se ancora aqui
- `.planning/phases/06-disponibilidade-calend-rio-do-m-dico/06-CONTEXT.md` + `06-01-SUMMARY.md`..`06-03-SUMMARY.md` — modelo híbrido, `expandAvailability`, calendário editável.
- `lib/expand-availability.ts` — a função pura que expande os slots livres (a consulta ocupa um desses slots).
- `lib/clinic-timezone.ts` — `CLINIC_TIME_ZONE`.
- `app/dashboard/agenda/page.tsx` + `components/dashboard/agenda/*` — o calendário onde a criação por clique vive (D-03).

### Padrões de código a seguir (do repo)
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/ARCHITECTURE.md` — three-layer, auth+paid gate, ownership scoping.
- `supabase/migrations/20260720000500_patient_vaccine_doses.sql` — molde de tabela owner-scoped (RLS + policies juntos).
- `supabase/migrations/20260327120000_patients_sex_enum.sql` + `20260314000000_medical_certificates.sql` — molde de **pg enum** (para o status).
- `supabase/migrations/20260301000000_patients_add_profile_id.sql` + `modules/patients/*` (`find-patient-by-profile-id-name-responsible.ts`, `get-patients-by-profile-id.ts`, `get-patient-by-id.ts`) — o domínio `patients` (FK + busca escopada por profile_id) que a consulta reusa (D-04).
- `actions/availability/save-availability.ts` + `supabase/migrations/20260722100000_save_availability_rpc.sql` — molde de action com gate + result union e de RPC transacional (útil se a criação precisar de atomicidade).

### Achado de scan (research)
- ⚠️ **Sem exclusion constraint / btree_gist / tstzrange no repo hoje** — a garantia de não-double-booking (D-08) é **greenfield**. Item forte de research no plan-phase (habilitar extensão `btree_gist`, escolher tipo de range, predicado parcial por status, e capturar 23P01 no action).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Domínio `patients`** (`modules/patients/*`, tabela `public.patients` com `profile_id` + RLS): FK e busca da consulta. Reusar `get-patients-by-profile-id` / `find-patient-by-profile-id-name-responsible`.
- **`expandAvailability` (Fase 6)**: fonte dos slots livres; a UI de criação filtra os slots livres e a validação server-side confirma que o slot pedido é realmente livre.
- **Calendário editável (Fase 6)** `components/dashboard/agenda/*`: superfície onde as consultas aparecem e são criadas (D-03) — precisará distinguir "slot livre" de "consulta pendente/confirmada/falta/cancelada".
- **pg enum** (`patient_sex`, `medical_certificate_type`): molde para o enum de status da consulta.

### Established Patterns
- Migrations `YYYYMMDDHHMMSS_*.sql`, RLS + policies no mesmo arquivo. Módulos: uma fn/arquivo, `SupabaseClient` injetado, error tag por domínio. Actions: `"use server"`, gate `paid`, Zod `safeParse`, result union, `revalidatePath`. Rota RSC sob `app/dashboard/`.

### Integration Points
- **Fase 8/9 (assento):** a assistente criará consultas como "pedido a confirmar" POR CIMA desta tabela/constraint — o schema e o exclusion desta fase são o contrato. Não adicionar membership/assento aqui.
- **Fase 10 (ganhos):** o lançamento financeiro referenciará a consulta (FK) — não adicionar colunas financeiras aqui.

</code_context>

<deferred>
## Deferred Ideas

- **Duração livre / consulta multi-slot** — nesta fase a consulta é 1 slot (D-01); duração variável fica para evolução futura.
- **Marcar consulta fora da disponibilidade (encaixe)** — não nesta fase (D-02).
- **Reabrir consulta cancelada/falta** — estados finais nesta fase (D-06).
- **Notificações de confirmação/lembrete** — fora do milestone.

</deferred>

---

*Phase: 07-consultas-ciclo-de-status*
*Context gathered: 2026-07-22 via discuss-phase*
