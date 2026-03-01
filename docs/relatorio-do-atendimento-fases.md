# Relatório do atendimento – tarefas por fases

Feature: substituir a seção "Resumo do atendimento" por **Relatório do atendimento** — relatório estruturado por seções do template do perfil, geração via Groq LLM, edição manual, drag-and-drop, "Melhorar com IA" por seção, finalizar edição e "Voltar a editar".

Copy da seção: **"Relatório do atendimento"**.

---

## Fase 1 – Schema e módulos de dados

- [x] **Migration:** criar tabela `case_reports`
  - `id` uuid PK (default gen_random_uuid()) — **usado como identificador do relatório para gerar e salvar o arquivo report.pdf no storage do Supabase** (path no bucket pode usar esse id).
  - `case_id` uuid unique not null FK → cases(id) on delete cascade
  - `profile_id` uuid not null FK → profiles(id) — para no futuro listar relatórios já gerados pelo usuário (casos dele).
  - `report_template_id` uuid not null FK → report_templates(id)
  - `sections` jsonb not null (array de `{ name, description?, content, order }`)
  - `is_finalized` boolean not null default false
  - `finalized_at` timestamptz nullable
  - `created_at`, `updated_at` timestamptz

- [x] **Report templates:** criar `modules/report-templates/get-report-template-by-id.ts`
  - Retorna `{ id, name, sections }` por id
  - Tipo de seção: `{ name: string, description?: string, information_not_extracted_reason?: string }`
  - Usado para obter template efetivo (perfil ou padrão) na página do caso

- [x] **Report templates:** criar `modules/report-templates/get-default-report-template.ts` para template efetivo quando `profile.report_template_id` é null.

- [x] **Cases:** criar `modules/cases/get-case-report.ts`
  - Busca relatório por `case_id`; validar ownership via profile_id (user_phone) quando necessário
  - (Não criar pasta `modules/case-reports`; funções ficam em `modules/cases`.)

- [x] **Cases:** criar `modules/cases/create-case-report.ts` e `modules/cases/update-case-report.ts` (responsabilidade dedicada)
  - `createCaseReport`: criação com validação de ownership (getCaseById) antes do insert
  - `updateCaseReport`: atualização parcial (sections, is_finalized, finalized_at) com validação de ownership (getCaseById) e `profile_id` no payload

- [x] **Resolução do template efetivo:** usar `getReportTemplateById` quando profile tem template; senão `getDefaultReportTemplate`. Garantir que existe um default (seed ou query por is_default).

---

## Fase 2 – Módulos Groq

- [ ] **Geração do relatório completo:** criar `modules/groq/generate-case-report.ts`
  - Modelo: **openai/gpt-oss-120b**
  - Input: `messages` (conversa), `sections` (template: name, description?)
  - Prompt: produzir texto por seção a partir da conversa (estruturar, PT-BR, gramática, pediatria, dosagens)
  - Retorno: conteúdo por seção; seção vazia → "Sem … registrada"
  - Seguir rule `.cursor/rules/groq-prompting-mdc` (estrutura do prompt, limites explícitos, parâmetros)
- [ ] **Melhorar uma seção:** criar `modules/groq/improve-report-section.ts`
  - Modelo: **llama-3.1-8b-instant**
  - Input: conversa + conteúdo atual da seção + nome/descrição da seção
  - Retorno: texto melhorado (mais profissional, alongar, encurtar conforme necessário)
  - Seguir rule `groq-prompting-mdc`

---

## Fase 3 – Server Actions

Todas as actions em **`app/dashboard/cases/actions.ts`**:

- [ ] **generateCaseReport:** obtém caso + mensagens + template efetivo; chama `generate-case-report` (Groq); monta `sections` com order; chama `createCaseReport` (já valida ownership); `revalidatePath` da rota do caso.
- [ ] **improveReportSection:** recebe caseId, sectionName (ou index), conteúdo atual; chama `improve-report-section` (Groq); retorna texto melhorado. Frontend usa esse retorno e chama updateCaseReport com sections atualizadas. Validar ownership.
- [ ] **updateCaseReport:** recebe caseId, profileId, payload (sections e/ou is_finalized). Chama `updateCaseReport` de `modules/cases/update-case-report.ts` (valida ownership com getCaseById); `revalidatePath`. Usado para: salvar reordenação, finalizar edição, voltar a editar.

---

## Fase 4 – UI e integração na página do caso

- [ ] **CaseDetailContent:** carregar template efetivo (get-report-template-by-id ou default) e `getCaseReport(supabase, caseId)`. Passar para o componente de relatório: template.sections, caseReport (ou null), caseId, messages, e se pode editar (`!caseReport?.is_finalized`).
- [ ] **Substituir CaseSummary** por novo componente **CaseReport** (ou nome equivalente):
  - Título da Card: **"Relatório do atendimento"**
  - Exibir quando houver template efetivo; se não existir relatório, mostrar botão "Gerar relatório" (habilitado apenas quando houver mensagens; senão desabilitado com tooltip "Necessário ter conversa")
  - Um bloco por seção do template: label = section.name, placeholder/empty state = section.description ou "Sem … registrada"
  - Cada bloco: textarea editável (conteúdo da seção) + botão "Melhorar com IA" (chama improveReportSection e depois updateCaseReport)
  - Drag-and-drop para reordenar blocos (ex.: @dnd-kit/core + @dnd-kit/sortable); ao soltar, atualizar order em sections e chamar updateCaseReport
  - Checkbox "Finalizar edição": ao marcar, chamar updateCaseReport com is_finalized: true; desabilitar inputs, "Melhorar com IA" e drag handles
  - Botão "Voltar a editar": visível quando relatório finalizado; ao clicar, updateCaseReport com is_finalized: false; reabilitar edição
- **(Opcional)** Ícones por seção: mapeamento name → ícone (lucide-react) ou ícone único para todas.

---

## Fase 5 – Documentação e skills

- [ ] Atualizar `docs/schema-supabase.md` com a tabela `case_reports` (id, case_id, profile_id, report_template_id, sections, is_finalized, finalized_at, created_at, updated_at) e nota sobre uso do `id` para path do report.pdf no storage.
- [ ] Atualizar `docs/estrutura-do-projeto.md` com novos arquivos: `modules/cases/get-case-report.ts`, `modules/cases/create-case-report.ts`, `modules/cases/update-case-report.ts`, módulos em `modules/groq/`, `app/dashboard/cases/actions.ts`.
- [ ] Atualizar skill `supabase-falaped` (schema) e `dashboard-falaped` (módulos/estrutura) se aplicável.
- [ ] Manter copy "Relatório do atendimento" consistente em docs e referências.

---

## Ordem sugerida

1. Fase 1 (schema + dados) → base para tudo.
2. Fase 2 (Groq) → geração e melhoria de texto.
3. Fase 3 (Server Actions) → pontes entre UI e módulos.
4. Fase 4 (UI) → experiência do usuário na tela do caso.
5. Fase 5 (docs) → ao finalizar a implementação.

