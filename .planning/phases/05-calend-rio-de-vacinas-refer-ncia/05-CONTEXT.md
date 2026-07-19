# Phase 5: Calendário de Vacinas (Referência) - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning

<domain>
## Phase Boundary

O médico consulta, durante o atendimento, o **calendário de vacinas por idade** — SUS/PNI e particular/SBIm exibidos lado a lado, mais a **referência de vacinação da gestante** — modelado como **dado versionado, somente leitura**, com fonte e data de vigência visíveis. Responde à pergunta "o que está previsto nesta idade?".

Cobre VAC-01 (tabela SUS/PNI por idade), VAC-02 (SBIm lado a lado + gestante), VAC-03 (referência da gestante com timing por semana gestacional), VAC-04 (dado versionado: vacina, dose, idade recomendada, fonte SUS|SBIm|gestante, ano/versão + vigência).

**NÃO é escopo:** carteira de vacinação por paciente / doses aplicadas / diff pendente-atrasada / próxima dose (isso é a Phase 6, que consome este calendário como dado). Nenhuma escrita de dado clínico por paciente nesta fase.

</domain>

<decisions>
## Implementation Decisions

### Layout do calendário (VAC-01 / VAC-02)
- **D-01:** Exibição principal = **duas colunas paralelas** — SUS/PNI à esquerda, particular/SBIm à direita — cada coluna como sua própria lista **por idade**. Comparação direta lado a lado (não grade vacina×idade, não accordion único).
- **D-02:** Ao abrir a partir de um paciente, o calendário **destaca a faixa de idade atual** da criança (rola/realça a idade corrente sem esconder passado/futuro) usando o motor de idade da Phase 1 (`lib/compute-pediatric-age.ts`). Não filtra só a idade atual — mostra o calendário inteiro com "onde estamos" realçado.

### Ponto de entrada / navegação
- **D-03:** Acesso por **duas vias**: (a) rota standalone `/dashboard/vaccines` na sidebar (referência geral, sem paciente) e (b) acesso a partir do **perfil do paciente**, que abre o calendário já com a idade da criança destacada (D-02). Espelha o padrão avulso + por-paciente das receitas (Phase 4 D-13).

### Referência da gestante (VAC-03)
- **D-04:** Apresentada como **terceira aba/seção separada** — abas "Criança (SUS × SBIm)" e "Gestante". Deixa explícito que é outro dataset com outro eixo (semanas gestacionais, não idade da criança), atendendo VAC-04 critério 3 (cada calendário rotulado e separado).
- **D-05:** Timing exibido como **lista por vacina com a janela em texto** — ex.: "dTpa — a partir de 20 semanas", "VSR/Abrysvo — 28–36 semanas", "Hepatite B", "Influenza — qualquer momento", "COVID-19". Não agrupar por trimestre (algumas vacinas cruzam trimestres). Vacinas obrigatórias do requisito: Hepatite B, dTpa (≥20 sem), Influenza, COVID-19, VSR/Abrysvo (≥28 sem).

### Modelo de dado / versionamento (VAC-04)
- **D-06:** Storage = **tabela(s) seed em Supabase** (decisão do usuário, divergindo do padrão in-repo JSON da Phase 3 `lib/growth-reference/`). Dados populados por migration/seed SQL.
- **D-07:** Acesso = **leitura global + seed-only**. RLS permite `SELECT` a qualquer usuário autenticado/`paid` — **sem filtro `profile_id`**, porque é dado de referência **compartilhado, não owned por médico** (nuance importante: diverge de todos os slices anteriores que escopam por `profile_id`). Nenhum caminho de escrita pelo app — atualização de vigência/dados só por migration/seed SQL (sem UI/action de admin nesta fase).
- **D-08:** Versionamento = **metadata por dataset (schedule)**. Uma tabela de "schedule" (SUS, SBIm, gestante) com `source`, `version`, `effective_date`/vigência (e notes); linhas de vacina/dose/idade referenciam o schedule. Vigência é do dataset inteiro — casa com o rodapé por bloco (D-09). Não versionar por linha.
- **D-09:** Proveniência na UI = **rodapé/cabeçalho por dataset** ("Fonte: PNI 2025 · vigência jan/2025") lido da metadata do próprio schedule, **mais um aviso persistente fixo** "Confira sempre contra o calendário oficial atual" (VAC-04 critério 3). Não usar banner único global desacoplado do dataset.

### Cross-cutting
- **D-10:** Toda rota/leitura aplica o preâmbulo `getAuthenticatedUser` + gate `profile.status === "paid"`. Diferente dos slices owned, **não** há escopo `profile_id` no dado de referência (D-07) — mas o gate `paid` da rota permanece.
- **D-11:** Motor de idade da Phase 1 é reusado só para **posicionar/destacar** a idade atual (D-02); nesta fase não há cálculo de diff/pendência (isso é Phase 6).

### Claude's Discretion
- Nomes exatos de tabelas/colunas e a forma de modelar "dose" e "idade recomendada" (coluna estruturada de meses vs rótulo texto como "2 meses", "12–15 meses") — decisão de research/planning, seguindo a granularidade que a Phase 6 vai precisar para o diff por idade.
- Componente de UI para as abas e colunas (reusar `components/ui/tabs`, layout de duas colunas) — seguir o design system existente.
- Se o calendário standalone precisa de busca por vacina — considerado nice-to-have, fora do escopo mínimo salvo indicação do planner.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos da fase
- `.planning/ROADMAP.md` §"Phase 5: Calendário de Vacinas (Referência)" — goal, success criteria, requisitos VAC-01..04.
- `.planning/REQUIREMENTS.md` — VAC-01, VAC-02, VAC-03, VAC-04 (linhas 40–43); tabela de cobertura (linhas 98–101).
- `.planning/PROJECT.md` — decisões travadas: vacinas em versão completa (referência Phase 5 + carteira Phase 6); referência SUS + particular + gestante.

### Padrão de dado de referência versionado (analog — precedente da Phase 3)
- `lib/growth-reference/index.ts` — padrão de **metadata de proveniência** (`source`, `version`, `ageMin`, `ageMax`) num dataset de referência tipado, com a UI exibindo fonte + faixa coberta (D-08/D-09 espelham essa ideia, mas em tabela DB e não JSON — ver D-06). Ler para replicar a *forma* da metadata, não o storage.
- `.planning/phases/03-curva-de-crescimento/03-CONTEXT.md` — decisões D-03 (source + faixa etária visível na UI) que inspiram a proveniência aqui.

### Padrão de rota/domínio a reaproveitar (código existente)
- `app/dashboard/` — rotas top-level separadas por domínio (ex.: `prescriptions`, `medical-certificates`, `referrals`); D-03 adiciona `/dashboard/vaccines` no mesmo molde (Phase 4 D-12).
- `lib/compute-pediatric-age.ts` — motor de idade da Phase 1 para destacar a idade atual (D-02/D-11).
- `components/dashboard/patients/` — perfil do paciente como ponto de entrada secundário (D-03).
- Migrations Supabase + RLS existentes (analog: `prescriptions`, `patient_measurements`) — molde para as migrations das tabelas de schedule, **mas com RLS de leitura global sem `profile_id`** (D-07 — divergência deliberada).

### Mapas de codebase
- `.planning/codebase/ARCHITECTURE.md`, `CONVENTIONS.md`, `STRUCTURE.md`, `INTEGRATIONS.md`, `CONCERNS.md` (§Pitfall 5 IDOR — nota: dado global read-only não sofre IDOR, mas confirmar RLS de leitura), `STACK.md`, `TESTING.md`.

Sem ADRs externos dedicados — requisitos plenamente capturados nas decisões acima + ROADMAP/REQUIREMENTS.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Motor de idade** (`lib/compute-pediatric-age.ts`, testado na Phase 1): posiciona/realça a idade atual da criança no calendário (D-02).
- **Padrão de metadata de proveniência** (`lib/growth-reference/index.ts`): a *forma* de expor `source`/`version`/faixa coberta na UI (D-08/D-09) — replicar o conceito no schedule DB.
- **Padrão de rota top-level** (`app/dashboard/prescriptions`, `medical-certificates`, `referrals`): molde para `/dashboard/vaccines` (D-03).
- **Padrão de migration + RLS** (`prescriptions`, `patient_measurements`): base para as tabelas de schedule — porém com RLS de **leitura global** (SELECT p/ authenticated/paid, sem `profile_id`), o que é uma divergência a implementar com cuidado (D-07).
- **Componentes shadcn/ui** (`components/ui/tabs`, tabela/lista): abas Criança/Gestante (D-04) e as duas colunas SUS/SBIm (D-01).

### Established Patterns
- Três camadas `app/ → actions/ → modules/`; uma função exportada por arquivo em `modules/`; preâmbulo auth/paid nas actions/route handlers (D-10).
- Queries escopadas por `profile_id` — **exceção nesta fase**: dado de referência é global, sem `profile_id` (D-07). Documentar explicitamente para não copiar o filtro por reflexo.
- Seed clínico exige checkpoint human-verify antes de commitar (mesmo tratamento dos dados WHO da Phase 3 e dos seeds da Phase 4).

### Integration Points
- Sidebar/nav do dashboard — nova rota `/dashboard/vaccines` (D-03).
- Perfil do paciente (`components/dashboard/patients/`) — ponto de entrada secundário com idade destacada (D-03/D-02).
- **Phase 6 (downstream):** a carteira por paciente vai consumir estas tabelas de schedule para o diff pendente/atrasada e próxima dose. A granularidade de "idade recomendada" por dose deve ser estruturada o suficiente para permitir esse diff (Claude's Discretion acima).

</code_context>

<specifics>
## Specific Ideas

- Vacinas da gestante nomeadas no requisito VAC-03, a exibir com janela em texto (D-05): **Hepatite B; dTpa a partir de 20 semanas; Influenza; COVID-19; VSR/Abrysvo a partir de 28 semanas**.
- Rótulos dos datasets: "SUS/PNI", "Particular (SBIm)", "Gestante" — cada um com sua fonte + vigência no rodapé (D-09).
- Aviso fixo textual: "Confira sempre contra o calendário oficial atual" (D-09).

</specifics>

<deferred>
## Deferred Ideas

- **Carteira de vacinação por paciente** (doses aplicadas, pendentes/atrasadas, próxima dose) — Phase 6 (VAC-05..07); consome este calendário.
- **Busca por vacina no calendário standalone** — nice-to-have; fora do escopo mínimo salvo indicação do planner.
- **PDF/impressão do calendário de referência** — não levantado como requisito; possível fase futura se o médico quiser imprimir/entregar.
- **UI/action de admin para editar vigência sem deploy** — considerado e preterido; nesta fase a atualização é seed-only por migration (D-07). Revisitar se a manutenção do dado ficar frequente.

### Content accuracy checkpoint (para research/planning)
- Os dados **seed** dos três calendários (SUS/PNI, SBIm, gestante) são **conteúdo clínico** e exigem **sign-off de acurácia do médico** contra as fontes oficiais atuais no momento do build (blocker já registrado em STATE.md: "[Phase 5] Acurácia dos dados PNI/SBIm deve ser verificada com o médico contra as fontes oficiais atuais"). Não commitar conteúdo clínico seed sem checkpoint human-verify. A UI já carrega o aviso de "confirmar contra o oficial" (D-09), mas isso não substitui o sign-off no seed.

</deferred>

---

*Phase: 5-Calendário de Vacinas (Referência)*
*Context gathered: 2026-07-19*
