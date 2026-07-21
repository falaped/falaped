# Phase 6: Disponibilidade & Calendário do Médico - Context

**Gathered:** 2026-07-20
**Status:** Ready for planning

<domain>
## Phase Boundary

O médico configura sua disponibilidade recorrente uma vez e vê a agenda corretamente em **dia / semana / mês** no fuso da clínica (America/Sao_Paulo). As **regras** de disponibilidade (dia da semana + faixa de horário + duração de slot) e as **exceções por data** ficam armazenadas; os **slots livres são expandidos na leitura** por uma função pura testável — nenhuma row por slot é persistida.

**Entrega esta fase (AGENDA-01..04):** grade recorrente semanal, duração de slot, exceções subtrativas por data, e as três views (dia/semana/mês) com viradas corretas no fuso.

**NÃO entrega (fases seguintes / fora de escopo):**
- Consultas, ligação a paciente, ciclo de status, exclusion constraint de não-double-booking → **Phase 7** (APPT-*).
- Qualquer acesso delegado / assento da assistente → **Phase 8/9** (SEAT-*).
- Livro-caixa de ganhos → **Phase 10** (EARN-*).
- Notificações (WhatsApp/e-mail) de agendamento → fora de escopo do milestone.
- **Zero nova superfície externa de ataque** nesta fase — tudo é do próprio médico dono, escopado por `profile_id`.

</domain>

<decisions>
## Implementation Decisions

### Edição da disponibilidade recorrente
- **D-01:** A entrada é uma **grade semanal clicável** (Seg–Dom × horas); o médico pinta/seleciona os blocos disponíveis. NÃO é um formulário de linhas. Não existe componente pronto para isso no repo — é construção nova.
- **D-02:** **Múltiplas faixas por dia** são suportadas — o médico deixa o bloco do almoço de fora e o dia vira duas faixas (ex: manhã 08–12 + tarde 14–18). O expandir-slots trata cada faixa contígua independentemente.
- **D-03:** Granularidade da grade = **passo de 30 min** (blocos de 30 min: 08:00, 08:30, ...). Faixas sempre começam/terminam em múltiplos de 30 min.

### Modelo de exceções (folga/feriado)
- **D-04:** Exceção é por **data**, podendo ser **dia inteiro** (feriado/folga) OU **parcial** (bloquear só uma faixa daquela data, ex: "nessa quarta saio 16h"). O schema da exceção guarda a data + uma faixa opcional (null = dia todo).
- **D-05:** Exceções são **apenas subtrativas** nesta fase — removem horário da grade recorrente (roadmap: "removem horários da grade"). Abrir disponibilidade extra pontual (aditivo) está **adiado** (ver Deferred).

### Views do calendário
- **D-06:** Três views dia/semana/mês; **view padrão = SEMANA** (horizonte natural da recorrência semanal e da rotina do pediatra solo).
- **D-07:** A view de **MÊS** mostra um **indicador leve por dia** (atende vs folga/sem disponibilidade — cor/ponto + total de slots livres), NÃO os slots reais dentro da célula. Detalhe de horários fica em semana/dia. (Racional: sem consultas na Fase 6, slots reais no mês ficariam densos/ilegíveis.)
- **D-08:** A grade de agenda **dia/semana** (colunas de dias × linhas de horário) é **CSS grid custom** (Tailwind), **sem adicionar lib de calendário**. O `components/ui/calendar.tsx` existente é date-picker (react-day-picker), não serve como agenda — mas segue disponível para o seletor de data das exceções.

### Geração de slots
- **D-09:** A **duração do slot é POR FAIXA** — cada faixa contígua carrega sua própria duração (manhã 08–12 = 30min; tarde 14–18 = 20min). A duração é um campo da linha de faixa, não uma config global. **Divergência consciente** de AGENDA-02 ("duração padrão do slot"): o médico quer variar por período do dia.
- **D-10:** **Descartar a sobra** quando a faixa não divide certo pela duração (14:00–18:00 com 45min → 14:00, 14:45, 15:30, 16:15, 17:00; ignora os 15min finais). Nunca cria slot parcial/quebrado. Este caso é um teste explícito no `.spec`.

### Travado pelo roadmap / requisitos (não re-discutido — flui direto pro plano)
- **D-11:** Fuso **fixo America/Sao_Paulo**; **semana começa na segunda**; intervalos **meio-abertos** `[início, fim)`; sem slot duplicado nem sumido nas viradas de dia/semana/mês.
- **D-12:** Regras/exceções **armazenadas**; slots **expandidos na leitura** por **função pura testável** (`.spec.ts`, molde: `lib/vaccine-*`, `lib/compute-pediatric-age`). Nenhuma row-por-slot persistida.
- **D-13:** Tabelas **owner-scoped por `profile_id`** com **RLS habilitada + policies na mesma migration** (padrão do repo). Padrão de três camadas `app/ → actions/ → modules/`, uma função exportada por arquivo, `SupabaseClient` injetado, gate de assinatura (`profile.status === "paid"`) nos actions.

### Claude's Discretion
- Range de horas visível na grade (ex: 06:00–22:00), rótulos, densidade visual, e detalhes de interação (arrastar vs clicar-célula) ficam a critério do planner/UI-spec, respeitando o passo de 30 min (D-03).
- Nomes de tabelas/colunas e forma exata da assinatura da função pura de expansão ficam a critério do planner (respeitando D-04/D-09: exceção com faixa opcional, duração por faixa).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo & requisitos desta fase
- `.planning/ROADMAP.md` § "Phase 6: Disponibilidade & Calendário do Médico" — Goal, Success Criteria (1–4), UI hint. **Fonte da verdade do escopo.**
- `.planning/REQUIREMENTS.md` — AGENDA-01, AGENDA-02, AGENDA-03, AGENDA-04 (texto integral dos requisitos).
- `.planning/PROJECT.md` § Key Decisions — decisões v1.1 (agendamento como "pedido a confirmar" é Phase 7; sem notificações; assento leve é Phase 8+).

### Padrões de código a seguir (do próprio repo)
- `.planning/codebase/CONVENTIONS.md` — three-layer, one-export-per-file, error handling, naming.
- `.planning/codebase/ARCHITECTURE.md` — auth + paid gate, per-request Supabase client, ownership scoping.
- `supabase/migrations/20260720000500_patient_vaccine_doses.sql` — **template de tabela owner-scoped** (`profile_id` + RLS + policies na mesma migration; comentários explicativos).
- `supabase/migrations/20260720000100_rls_vaccine_schedules.sql` — convenções de RLS (enable + policies juntos; regra "RLS sem policy = negação silenciosa").
- `lib/compute-pediatric-age.ts` + `lib/compute-pediatric-age.spec.ts` — **molde de função pura + teste** (padrão para o expandir-slots).
- `modules/patient-vaccine-doses/` — molde de módulo CRUD owner-scoped (uma fn por arquivo, client injetado).

### Achado de scan relevante para pesquisa
- ⚠️ **Não há tratamento de fuso horário no código hoje** — sem `date-fns-tz`, sem `America/Sao_Paulo`. `date-fns` ^4.1.0 está instalado. A lógica de virada dia/semana/mês em SP (D-11) é **greenfield** — item forte de pesquisa no `plan-phase` (avaliar `@date-fns/tz`/`date-fns-tz` vs. `Intl`/Temporal-polyfill).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`lib/*.spec.ts` + `tsx --test`**: forte precedente de função pura testada (`lib/vaccine-current-band.ts`, `lib/lms-zscore.ts`, `lib/compute-pediatric-age.ts`). O expandir-slots deve nascer como `lib/<nome>.ts` com `.spec.ts` cobrindo: múltiplas faixas/dia (D-02), sobra descartada (D-10), duração por faixa (D-09), exceção parcial e dia-todo (D-04), viradas de fuso (D-11).
- **`components/ui/calendar.tsx`** (react-day-picker): serve como **date-picker do seletor de data de exceção**, NÃO como grade de agenda.
- **`date-fns` ^4.1.0**: já instalado, usado em `lib/formatters.ts`, `lib/brazilian-date-form.ts`, wizards. Reusar para aritmética de datas — mas fuso precisa de solução adicional (ver canonical_refs).

### Established Patterns
- **Migrations** `supabase/migrations/YYYYMMDDHHMMSS_*.sql`, ordem `table → rls → seed`, RLS sempre no mesmo arquivo (D-13).
- **Módulos** `modules/<domain>/` uma fn exportada por arquivo, `SupabaseClient` injetado, `throw new Error("[DOMAIN] ...")`; actions capturam e retornam result unions `{ ok: true } | { ok: false; error }` com gate `profile.status === "paid"`.
- **Rotas** `app/dashboard/<domain>/` — nova rota de agenda seguirá o padrão (provável `app/dashboard/agenda/`).

### Integration Points
- Nova tabela(s) de disponibilidade + exceções escopadas por `profile_id` referenciando `public.profiles(id)`.
- Nova rota de dashboard (agenda) + novo módulo `modules/<agenda>/` + actions.
- **Alvo futuro:** Phase 7 (consultas) vai ligar consultas a estes horários; manter o modelo de disponibilidade limpo o suficiente para a exclusion constraint da Phase 7 escrever por cima. Não implementar nada de consulta aqui.

</code_context>

<specifics>
## Specific Ideas

- O médico quer refletir a rotina real da clínica pediátrica: **manhã e tarde separadas por almoço** (motivou D-02 múltiplas faixas) e **durações diferentes por período** (motivou D-09 duração por faixa).
- Exceção "saio mais cedo nessa data" precisa existir sem desmontar a recorrência (motivou D-04 exceção parcial).

</specifics>

<deferred>
## Deferred Ideas

- **Disponibilidade extra pontual (exceção aditiva):** abrir um horário num dia que normalmente não atende (ex: "nesse sábado específico atendo 09–12"). Fora de escopo da Fase 6 (roadmap = só subtrativo). Revisitar se surgir demanda real — exigiria o expandir-slots somar faixas ad-hoc.
- **Duração de slot global única:** se a duração por faixa (D-09) se mostrar excesso na prática, um fallback de duração padrão global é uma simplificação possível no futuro.
- **Slots reais na célula do mês / view de mês mais rica:** só faz sentido depois que houver consultas (Phase 7+) para ancorar visualmente.

### Reviewed Todos (not folded)
None — nenhum todo pendente casou com a Fase 6.

</deferred>

---

*Phase: 6-Disponibilidade & Calendário do Médico*
*Context gathered: 2026-07-20*
