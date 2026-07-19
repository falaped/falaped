# Phase 4: Documentos Clínicos Novos - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning

<domain>
## Phase Boundary

O médico gera **cinco novos artefatos de documento** — encaminhamento (DOC-01), pedido de exames (DOC-02), relatório médico de corpo livre (DOC-03), receituário em branco (DOC-05) e uma biblioteca de orientações por marco (DOC-06) — mais o suporte a **templates salváveis** para encaminhamento/pedido de exames/relatório (DOC-04). Cada documento reaproveita o padrão já estabelecido das receitas (wizard/formulário + template salvável + geração de PDF via `@falaped/falaped-kit/pdf`), é auto-preenchido com os dados do paciente (nome/DOB/idade), aplica o gate `paid` e escopa toda leitura/escrita/exclusão por `profile_id` (+ `patient_id` quando ligado a paciente).

**NÃO é escopo:** reescrever receitas/atestados/laudos existentes (só estender); extração de exames por foto/IA (v2); o laudo/relatório de caso existente (o relatório médico é um tipo NOVO e separado).

</domain>

<decisions>
## Implementation Decisions

### Pedido de exames (DOC-02)
- **D-01:** Catálogo de exames = **catálogo pediátrico seed + busca + texto livre**. Ship um catálogo pesquisável de exames comuns (hemograma, EAS, etc.) E permitir o médico digitar itens fora do catálogo.
- **D-02:** Painéis reutilizáveis (ex: "rotina lactente") = **alguns painéis default seed + painéis criados pelo médico**. Não deferir painéis.
- **D-03:** Ao aplicar um painel, os itens entram como **itens editáveis no pedido** (o médico adiciona/remove antes de gerar o PDF) — não como bloco fixo.

### Biblioteca de orientações (DOC-06)
- **D-04:** Conteúdo inicial = **seed editável** — um conjunto inicial de textos de orientação por marco que o médico revisa/edita antes de usar (NÃO vazio).
- **D-05:** Organização por **marcos do calendário de puericultura padrão**: 1ª consulta, 1m, 2m, 4m, 6m, 9m, 12m, 18m, 24m, depois anual. O médico pode adicionar marcos próprios.
- **D-06:** Uso = **documento próprio imprimível com auto-fill do paciente** (seleciona a orientação de um marco → cabeçalho auto-preenchido → PDF), mesmo padrão dos outros documentos. (Anexar à receita fica fora deste escopo.)

### Encaminhamento (DOC-01)
- **D-07:** Especialidade/serviço de destino = **picklist de destinos pediátricos comuns + texto livre** (ORL, oftalmo, neuroped, fono, fisio, nutri… + "outro" livre).
- **D-08:** Níveis de urgência = **Rotina / Prioritário / Urgente** (três níveis).
- **D-09:** Campos herdados do requisito: especialidade/serviço, motivo, resumo clínico/hipótese, urgência; PDF auto-preenchido com dados do paciente.

### Relatório médico (DOC-03)
- **D-10:** Estrutura = **campo título/finalidade + um único corpo rich-text livre (TipTap)**, cabeçalho auto-preenchido com dados do paciente. Deliberadamente mais simples/diferente do laudo multi-seção — mantém a separação visual e conceitual do laudo/relatório de caso existente (confirmado no PROJECT.md).

### Templates (DOC-04)
- **D-11:** Encaminhamento, pedido de exames e relatório médico têm **templates salváveis** seguindo o mesmo padrão de `prescription-templates` (per-médico, escopo `profile_id`). (Receituário em branco e orientações têm seus próprios mecanismos — ver D-13/D-04.)

### Navegação e ponto de entrada
- **D-12:** Navegação = **rota top-level separada por tipo de documento** (consistente com `/dashboard/prescriptions` e `/dashboard/medical-certificates` existentes), não um hub unificado.
- **D-13:** Ponto de entrada = **a partir do perfil do paciente (auto-fill nome/DOB/idade) + fluxo avulso com seletor de paciente** — espelha como as receitas funcionam hoje (por-paciente e por-caso).
- **D-14:** Receituário em branco (DOC-05) = **um modo "em branco/vazio" do fluxo de receita existente** (mesmo layout, corpo vazio) — não um tipo de documento separado. Menos código novo, casamento visual garantido.

### Cross-cutting (herdado de fases anteriores / success criteria)
- **D-15:** Todo documento novo aplica o preâmbulo `getAuthenticatedUser` + gate `profile.status !== "paid"` e escopa `profile_id` (+ `patient_id`) em toda leitura/escrita/exclusão (success criterion #5; Pitfall 5 IDOR).
- **D-16:** PDF gerado via `@falaped/falaped-kit/pdf` herdando a correção de impressão da Phase 1 (sem página em branco extra) — não refazer o builder.

### Claude's Discretion
- Forma exata do armazenamento do payload (JSONB `payload` como nas receitas vs colunas dedicadas) — decisão de research/planning, seguindo o analog de `prescriptions`/`medical_certificates`.
- Se AI-assist (Groq) entra no corpo do relatório médico como em `report-templates/generate-with-ai-content` — não decidido; fica a critério do planner (não é requisito desta fase, pode ser deixado de fora do MVP).
- Compartilhamento de templates (global vs per-médico) — seguir o padrão existente (per-médico) salvo indicação contrária.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos da fase
- `.planning/ROADMAP.md` §"Phase 4: Documentos Clínicos Novos" — goal, success criteria, requisitos DOC-01..06.
- `.planning/REQUIREMENTS.md` — DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06 (linhas 31–36).
- `.planning/PROJECT.md` — decisões travadas: novos docs reusam o padrão das receitas; relatório médico é tipo NOVO separado do laudo; extração de exames por IA é v2; TipTap disponível; Groq disponível.

### Padrão a reaproveitar (código existente)
- `modules/prescriptions/` — padrão canônico: `insert-prescription.ts`, `types.ts` (payload JSONB), `generate-prescription-pdf.ts`, `upload-prescription-pdf.ts`, `get-prescriptions-by-{patient-id,profile-id,case-id}.ts`, `delete-prescription{,s-bulk}.ts` (escopo owner).
- `modules/prescription-templates/` — padrão de template salvável per-médico (`create/update/delete/get-*`).
- `modules/medical-certificates/` — segundo analog do mesmo padrão (preview segments, pdf path).
- `components/dashboard/prescriptions/prescription-wizard.tsx` — wizard reusável; `prescription-card.tsx`, `prescription-table.tsx`.
- `components/dashboard/report-templates/report-template-sections-editor.tsx` + `generate-with-ai-content.tsx` — editor rich-text/seções e AI-assist (referência para o corpo do relatório e para NÃO copiar a estrutura de seções no relatório médico).
- `lib/pdf/` + `@falaped/falaped-kit/pdf` — builder de PDF com a correção da Phase 1 (CONS-04).

### Mapas de codebase
- `.planning/codebase/ARCHITECTURE.md`, `CONVENTIONS.md`, `STRUCTURE.md`, `INTEGRATIONS.md`, `CONCERNS.md` (§Pitfall 5 IDOR), `STACK.md`, `TESTING.md`.

Sem ADRs externos dedicados — requisitos plenamente capturados acima + no ROADMAP/REQUIREMENTS.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Prescriptions stack** (`modules/prescriptions` + `actions/prescriptions` + `components/dashboard/prescriptions/prescription-wizard.tsx`): o molde direto para os 4 novos docs de formulário e para o receituário em branco (D-14). Payload JSONB + `pdf_storage_path` + escopo `profile_id`/`patient_id`.
- **Prescription-templates stack**: molde direto para os templates de encaminhamento/pedido-de-exames/relatório (D-11).
- **Report-templates rich-text** (`report-template-sections-editor.tsx`, `generate-with-ai-content.tsx`): TipTap já integrado — base para o corpo rich-text do relatório médico (D-10), usando corpo único (não seções).
- **PDF builder** (`@falaped/falaped-kit/pdf`, `lib/pdf/`): reutilizar como está; correção de impressão da Phase 1 já aplicada (D-16).
- **Padrão de auto-fill de paciente**: já existe nas receitas (patientName/birthDate no payload) — estender para nome/DOB/idade (motor de idade da Phase 1).

### Established Patterns
- Três camadas `app/ → actions/ → modules/`; uma função exportada por arquivo em `modules/`; actions com result union + preâmbulo auth/paid/Zod; queries escopadas por `profile_id` (+`patient_id`).
- Cada tipo de documento existente tem sua própria rota top-level em `app/dashboard/*` — D-12 segue esse padrão para os novos tipos.
- Migrations Supabase + RLS owner-scoped (analog: `prescriptions`, `medical_certificates`) para as tabelas novas (documentos, templates, catálogo/painéis de exames, orientações).

### Integration Points
- Perfil do paciente (`components/dashboard/patients/patient-detail-*`) — ponto de entrada primário com auto-fill (D-13).
- Sidebar/nav do dashboard — novas rotas por tipo de documento (D-12).
- Motor de idade da Phase 1 (`lib/compute-pediatric-age.ts`) — para a idade no cabeçalho auto-preenchido.

</code_context>

<specifics>
## Specific Ideas

- "Rotina lactente" citado como exemplo concreto de painel de exames reutilizável (D-02).
- Marcos de orientação como "1ª consulta, 1 mês, 2 meses…" citados no requisito (D-05) → mapeados ao calendário de puericultura padrão.
- Receituário em branco descrito como "corpo vazio para colar receitas prontas que o médico já mantém" → reforça a decisão de modo-da-receita (D-14).

</specifics>

<deferred>
## Deferred Ideas

- **Extração/transcrição de exames por foto via IA** — v2 (PROJECT.md); item mais complexo, fora deste ciclo.
- **AI-assist (Groq) no corpo do relatório médico** — possível, mas não requisito; deixar a critério do planner e provavelmente fora do MVP desta fase.
- **Anexar orientações dentro da receita** — considerado e não adotado (orientações são documento próprio, D-06); pode ser revisto em fase futura.
- **Hub "Documentos" unificado** — considerado e preterido em favor de rotas separadas (D-12); revisitar se a sidebar ficar densa demais em fases futuras.

### Content accuracy checkpoint (para research/planning)
- Os dados **seed** — catálogo de exames pediátricos (D-01), painéis default (D-02) e textos de orientação por marco (D-06) — são **conteúdo clínico** e exigem sign-off de acurácia do médico no momento do build (mesmo tratamento dos blockers de dados WHO/vacina). Não commitar conteúdo clínico seed sem checkpoint human-verify.

</deferred>

---

*Phase: 04-documentos-cl-nicos-novos*
*Context gathered: 2026-07-10*
