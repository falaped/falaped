# Phase 1: Experiência da Consulta - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Entrega a experiência central da consulta pediátrica: (1) idade da criança exibida com precisão pediátrica a partir da data de nascimento, (2) cronômetro de consulta, e (3) impressão/PDF de relatórios sem espaçamento excessivo nem página em branco extra. Cobre CONS-01..04. Estabelece o **motor de idade** (keystone consumido pela vacina na Fase 5) e a **correção do builder de PDF** (herdada pelos documentos novos na Fase 3).

Fora desta fase: novos tipos de documento (Fase 3), foto do paciente (Fase 2), qualquer feature de vacina (Fases 4–5).

</domain>

<decisions>
## Implementation Decisions

### Cronômetro de Consulta
- **D-01:** Timer **vinculado ao caso/atendimento** — reusa `cases.started_at` / `cases.ended_at` (já existem na tabela). NÃO criar cronômetro avulso desvinculado.
- **D-02:** **Auto-start ao abrir o caso** — começa a contar quando o atendimento é aberto/criado, sem botão "Iniciar consulta".
- **D-03:** **Suporta pausar/retomar.** ⚠️ Tensão técnica para o planner: pausa/retomada exige persistência ALÉM de `started_at`/`ended_at` (duração pausada acumulada ou segmentos de tempo). Além disso, "auto-start ao abrir" + "pausar" precisa reconciliar o âncora de tempo (contar a partir de `started_at` da criação do caso vs um timestamp explícito de início de consulta). Resolver o modelo de dados no planejamento.
- **D-04:** UI = **widget flutuante reposicionável por drag-and-drop** (usuário arrasta e solta em qualquer lugar da tela). Reaproveita `@dnd-kit` (já é dependência). Persistir a posição entre sessões é discrição do Claude.
- **Nota de implementação (research):** tick client-side calculando a partir do timestamp (setInterval só repinta) para evitar drift/throttle — não usar um contador incremental que zera no reload.

### Exibição da Idade
- **D-05:** Idade aparece no **perfil/cabeçalho do paciente**, no **cabeçalho do caso/atendimento** (junto do cronômetro) e (intenção) **nos documentos gerados** — a parte dos documentos se concretiza na Fase 3; aqui só registra a intenção. NÃO mostrar em listas de pacientes.
- **D-06:** A idade calculada **acompanha a data de nascimento** (exibe ambos, ex: "12/03/2025 · 3 meses e 12 dias").
- **D-07:** Convenção de faixa etária (refina o padrão pediátrico com semanas): **0–28 dias → dias**; **~1–3 meses → semanas** (até ~12 semanas); **~3–24 meses → meses + dias**; **≥24 meses → anos + meses**. Tudo derivado da data de nascimento, sem armazenar idade.
- **D-08:** Texto **por extenso** ("3 meses e 12 dias", "2 anos e 4 meses"). Forma abreviada em espaços compactos fica a critério do Claude.

### Casos de Borda da Idade
- **D-09:** Sem data de nascimento → mostrar **aviso/CTA para completar o cadastro** (não vazio, não quebrar).
- **D-10:** **Idade corrigida de prematuro ENTRA neste ciclo.** ⚠️ Amplia o escopo de CONS-01: requer um **campo novo de idade gestacional ao nascer** no cadastro do paciente (migração na tabela `patients` + input no formulário) e o cálculo de **idade corrigida até ~24 meses de idade corrigida**, com rótulo distinguindo idade corrigida vs cronológica. Toca tabela `patients` + form de paciente — planner deve dimensionar isso.
- **D-11:** Mostrar idade em **semanas até ~3 meses (12 semanas)**, depois trocar para meses+dias.
- **D-12:** Data de nascimento **inválida ou no futuro → mostrar erro/aviso** (não silenciar, não tratar como ausente).
- **Nota de implementação (research/Pitfalls):** o motor de idade deve ser **um helper único e testado** em `lib/`, calculando com data-calendário em **meia-noite local** (não `new Date("YYYY-MM-DD")` em UTC, não divisão de milissegundos), com tratamento explícito de fim de mês, ano bissexto, virada de ano e recém-nascido. Esse mesmo helper é reaproveitado pela lógica de pendentes/atrasadas da carteira de vacina (Fase 5).

### Correção de Impressão (CONS-04) — NÃO discutida, ABERTA para o pesquisador
O usuário optou por não discutir esta área agora. Itens a serem resolvidos pelo gsd-phase-researcher antes do planejamento:
- **Superfície do bug:** PDF baixado (de `buildReportPdf`) vs print do navegador. Assunção: é o PDF gerado pelo kit. Confirmar.
- **Acesso ao kit:** o `@falaped/falaped-kit` é **editável neste ciclo**? A causa-raiz mora no kit (`buildReportPdf` mistura o modelo de fluxo do pdfkit com posicionamento absoluto; drift de `heightOfString`; reserva de rodapé forçando `addPage()` cedo; parágrafos vazios do TipTap virando `\n\n`). Pode exigir release/bump do kit (atual `0.2.7`). Se o kit NÃO for editável, decidir mitigação no app (sanitizar inputs) — fix parcial.
- **Amostra:** obter um relatório de exemplo que reproduz o espaço/página extra para validar o fix (critério de sucesso da fase exige verificar 1 página, no limite ~1,05 e múltiplas páginas).
- **Limpeza:** remover o `console.log("datapdf", datapdf)` esquecido em `actions/cases/download-case-report-pdf.ts`.

### Claude's Discretion
- Estilo/posição exata do badge de idade por contexto (extenso no perfil; pode abreviar em cabeçalhos/áreas apertadas).
- Persistência (ou não) da posição do widget flutuante entre sessões.
- Estrutura de dados da pausa (segmentos vs acumulado), desde que o tempo sobreviva a reload e seja correto.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Fase / Requisitos
- `.planning/ROADMAP.md` — Phase 1 details (goal + 4 critérios de sucesso, incluindo verificação do PDF em 1 página / ~1,05 / múltiplas páginas)
- `.planning/REQUIREMENTS.md` — CONS-01 (idade por faixa), CONS-02/03 (cronômetro persistido), CONS-04 (impressão sem página extra)

### Pesquisa (decisões e causa-raiz)
- `.planning/research/SUMMARY.md` — síntese; sequência e flags por fase
- `.planning/research/STACK.md` — date-fns já cobre idade; timer nativo; causa-raiz do PDF lida no kit
- `.planning/research/PITFALLS.md` — pitfalls de idade (timezone/borda), causa-raiz pdfkit, scoping brownfield
- `.planning/research/FEATURES.md` §"Pediatric Age Display" — convenção de faixa etária (dias/semanas/meses+dias/anos)

### Mapa do código
- `.planning/codebase/ARCHITECTURE.md` — padrão 3 camadas app→actions→modules; gate `paid` + escopo `profile_id`
- `.planning/codebase/STRUCTURE.md` — onde adicionar código novo
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/STACK.md` — convenções e deps

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/brazilian-date-form.ts` — helpers de parse/validação de data (date-fns + ptBR). Casa natural do novo helper de idade.
- `date-fns` ^4 (já instalado) — `intervalToDuration` (meses+dias), `differenceInDays`/`differenceInWeeks` para dias/semanas.
- `modules/patients/types.ts` → `Patient.birth_date: string | null` (ISO `yyyy-mm-dd`) — entrada do motor de idade.
- `modules/cases/types.ts` → `CaseWithPatient.started_at: string` + `ended_at: string | null` — âncora do cronômetro (já persiste o início do atendimento).
- `@dnd-kit/core` + `@dnd-kit/utilities` (já instalados) — arrastar/soltar o widget flutuante do cronômetro.
- `actions/cases/download-case-report-pdf.ts` + `buildReportPdf` de `@falaped/falaped-kit/pdf` — alvo do CONS-04 (passa `sections` {title, content}). Tem `console.log("datapdf")` esquecido (remover).

### Established Patterns
- 3 camadas `app/ → actions/ ("use server" + auth + Zod) → modules/ (função por arquivo, SupabaseClient injetado)`.
- Toda leitura/escrita escopada por `profile_id`; todo action gateia em `profile.status === "paid"`.
- Lógica pura testada em `*.spec.ts` co-localizado (ex: `lib/*.spec.ts`) — o motor de idade deve ter spec.

### Integration Points
- Idade: componentes de perfil/identificação do paciente (`components/dashboard/patients/`) e `components/dashboard/cases/case-detail-header.tsx`.
- Cronômetro: `components/dashboard/cases/case-detail-header.tsx` / `case-detail-state-card.tsx` / `new-case-workspace.tsx`; persistência via action sobre `cases`.
- Idade gestacional (D-10): migração na tabela `patients` + form de cadastro/edição de paciente (`modules/patients/create-patient.ts`, `update-patient.ts`, types).
- PDF (CONS-04): `actions/cases/download-case-report-pdf.ts` → `@falaped/falaped-kit/pdf` (kit externo).

</code_context>

<specifics>
## Specific Ideas

- Cronômetro como widget flutuante que o médico arrasta e posiciona onde quiser na tela durante o atendimento.
- Idade sempre visível ao lado da data de nascimento, por extenso, e usando semanas nos primeiros ~3 meses (linguagem de puericultura).
- Suporte a prematuro com idade corrigida — sinaliza que o médico atende prematuros e quer a idade corrigida correta.

</specifics>

<deferred>
## Deferred Ideas

- **Analytics de tempo de consulta** (média, histórico por paciente) — v2 (AI-02 em REQUIREMENTS.md). O cronômetro desta fase só gera os dados; a agregação fica para depois.
- **Discussão da correção do PDF (CONS-04)** — não discutida por escolha do usuário; resolvida via pesquisa, não diferida para outra fase (continua no escopo da Fase 1).

</deferred>

---

*Phase: 1-Experiência da Consulta*
*Context gathered: 2026-06-28*
