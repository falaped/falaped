# Phase 3: Curva de Crescimento - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Entrega uma capacidade de **acompanhamento de crescimento por paciente**: o pediatra **registra medições antropométricas ao longo do tempo** (peso, comprimento/estatura, perímetro cefálico; IMC derivado) formando um **histórico editável no perfil do paciente**, e **visualiza a curva de crescimento em gráficos por idade** com as medições da criança **plotadas sobre curvas de referência** (percentil/z-score), sex-specific. Consome o motor de idade pediátrica da Phase 1 (`lib/compute-pediatric-age.ts`), incluindo idade corrigida para prematuros. Cobre GROWTH-01, GROWTH-02, GROWTH-03.

**Fora desta fase (adiado):**
- **Exportação/PDF da curva** — MVP entrega só visualização em tela; PDF fica para iteração futura.
- **Registro no fluxo do atendimento (caso/consulta)** — neste MVP o registro e o histórico vivem no **perfil do paciente**, não amarrados ao caso.
- **Alertas/notificações automáticas de desvio de crescimento** — fora do escopo.
- Documentos clínicos (Phase 4), calendário de vacinas (Phase 5) e carteira de vacinação (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Padrão de referência & indicadores (GROWTH-02)
- **D-01:** Padrão **OMS (WHO)** como base — 0–5 anos + 5–19 anos — **mais Intergrowth-21** como referência do período de prematuro/RN. OMS é o padrão adotado pelo Ministério da Saúde/Caderneta da Criança no Brasil.
- **D-02:** Plotar as **4 curvas**: peso/idade, estatura(comprimento)/idade, IMC/idade, perímetro cefálico/idade. Todas **sex-specific** (usar `patients.sex`: `masculino`/`feminino`).
- **D-03:** Faixa etária alvo **0–19 anos**, respeitando o limite de dado oficial de cada curva (nota clínica: OMS peso/idade só vai até ~10a; estatura e IMC até 19a; PC até ~5a). Cada curva cobre a faixa onde há dado de referência.

### Prematuridade / idade corrigida (GROWTH-03)
- **D-04:** Para prematuros, **plotar os dois pontos** na curva OMS: pela **idade cronológica** e pela **idade corrigida**, lado a lado, para o médico comparar. Intergrowth-21 é a referência do período de prematuro/RN (transição para OMS).
- **D-05:** Aplicar a correção da prematuridade **até 36 meses (3 anos)**.
- **D-06:** Uso da idade corrigida é **automático via `gestational_age_weeks` < 37 sem**, com **toggle manual** no gráfico para alternar cronológica ↔ corrigida.
- **⚠️ D-07 (landmine para o researcher/planner):** `lib/compute-pediatric-age.ts` (Phase 1) **limita a idade corrigida a 24 meses**. Como a correção aqui vai até 36 meses, o motor precisa ser **estendido** OU a idade corrigida do gráfico calculada localmente até 3 anos. NÃO reaproveitar o cap de 24m cegamente.

### Modelo de dados & entrada (GROWTH-01)
- **D-08:** O **histórico de medições é uma tabela/estrutura NOVA**, separada. Os campos scalar atuais `weight`/`height`/`head_circumference` em `patients` **continuam existindo e coexistem** (valor de referência editado à mão, que alimenta o card de IMC atual em `patient-clinical-overview.tsx`). **Não migrar nem aposentar** esses campos neste MVP.
- **D-09:** Registro e histórico vivem **na tela do perfil do paciente** (não no fluxo do atendimento neste MVP).
- **D-10:** Permitir **medições com data retroativa** (data no passado) para montar o histórico de crianças já acompanhadas — sem isso a curva começa vazia.
- **D-11:** Cada medição pode ter peso e/ou estatura e/ou PC (campos opcionais); **IMC é derivado** quando peso E estatura existem na mesma medição.

### Visualização (GROWTH-02)
- **D-12:** Linhas de referência com **toggle entre percentil (P3/P15/P50/P85/P97) e escore-z (-3 a +3 DP)** no mesmo gráfico.
- **D-13:** **Calcular e mostrar a posição da própria criança** por medição: percentil/z-score + **classificação** (ex: "peso no P75", "IMC: eutrófico/sobrepeso"). Reaproveitar a lógica de faixa de IMC já existente (`lib/patient-bmi-ui-status.ts`).

### Segurança (GROWTH-03 — travado pelo padrão do app)
- **D-14:** Toda leitura/escrita/edição/exclusão de medição escopada por `profile_id` + `patient_id`, atrás do gate `paid`, com **teste de ownership** (app **sem RLS de tabela** — ver CONCERNS Pitfall 5). O médico pode **editar e remover** medições do histórico.

### Claude's Discretion
- Biblioteca/técnica de gráfico (não há chart lib no projeto — escolha do researcher/planner; considerar SVG/Recharts/visx, peso do bundle, e capacidade de plotar linhas de referência densas).
- Modelo exato da tabela de medições (colunas, unidades armazenadas) e como a idade da medição é derivada (data da medição − data de nascimento via motor da Phase 1).
- Unidades e validação de entrada (kg/g, cm), formatação e limites plausíveis.
- Como armazenar/servir os datasets de referência OMS/Intergrowth (tabela versionada, JSON estático versionado, etc.), desde que exiba fonte e faixa etária coberta.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Fase / Requisitos
- `.planning/ROADMAP.md` §"Phase 3: Curva de Crescimento" — goal + 3 critérios de sucesso
- `.planning/REQUIREMENTS.md` §"Curva de Crescimento (GROWTH)" — GROWTH-01 (registrar/editar histórico), GROWTH-02 (gráficos sobre referência OMS), GROWTH-03 (posicionamento por idade + gate `paid`/escopo `profile_id`)
- `.planning/PROJECT.md` — Bloco 5 (Active) + Key Decisions (curva inserida como Phase 3, 2026-07-09)

### Motor de idade (dependência da Phase 1)
- `lib/compute-pediatric-age.ts` — motor de idade pediátrica + idade corrigida (⚠️ cap de 24m; ver D-07)
- `lib/compute-pediatric-age.spec.ts` — casos de borda cobertos pelo motor
- `.planning/phases/01-experi-ncia-da-consulta/01-CONTEXT.md` — decisões do motor de idade (band boundary 24m, idade corrigida por deslocamento da data de nascimento)

### Mapa do código
- `.planning/codebase/CONCERNS.md` — app **sem RLS de tabela**; todo slice novo precisa filtro `profile_id` + gate `paid` + teste de ownership (Pitfall 5)
- `.planning/codebase/ARCHITECTURE.md` — padrão 3 camadas `app → actions → modules`; gate `paid` + escopo `profile_id`
- `.planning/codebase/STRUCTURE.md`, `.planning/codebase/CONVENTIONS.md` — onde adicionar código e convenções (uma query por arquivo em `modules/{domain}`)
- `.planning/codebase/STACK.md` — stack atual (confirmar ausência de chart lib antes de escolher)

### Skills do projeto
- `.cursor/skills/supabase-falaped/SKILL.md` — onde/como criar queries (uma query por arquivo, client como 1º argumento)
- `.cursor/skills/pediatric-dashboard-design/SKILL.md` — design do dashboard pediátrico (para a UI da curva)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/compute-pediatric-age.ts` — idade + idade corrigida (⚠️ estender além de 24m para a correção até 36m; ver D-07).
- `lib/patient-bmi-ui-status.ts` + `components/dashboard/patients/patient-clinical-overview.tsx` — cálculo/exibição de IMC com faixas de cor de triagem. Reaproveitar a lógica de classificação (D-13); manter esse card intacto sobre os campos scalar (D-08).
- `modules/patients/patient-sex.ts` — enum `masculino`/`feminino` para escolher a curva sex-specific (D-02).
- `modules/patients/` — `get-patient-by-id.ts`, `types.ts` (`Patient` já tem `weight`/`height`/`head_circumference` scalar, `gestational_age_weeks`, `sex`, `birth_date`). O novo módulo `modules/patient-growth/` (ou nome equivalente) segue o mesmo padrão de injeção de `SupabaseClient`.
- `supabase/migrations/20260604000002_rls_patients.sql` — padrão de escopo por `profile_id` (referência para a nova tabela de medições).

### Established Patterns
- Módulo: recebe `SupabaseClient` por injeção, uma query por arquivo, throw `Error("[DOMAIN] ...")`.
- Action: `getAuthenticatedUser` → gate `paid` → Zod `safeParse` → delega a `modules/` → retorna union `{ ok }`.
- Sem RLS de tabela por padrão — exige filtro explícito `profile_id`/`patient_id` + teste de ownership (D-14).

### Integration Points
- Nova tabela/migration de medições (histórico) escopada por `profile_id` + `patient_id`.
- Nova seção no **perfil do paciente** (registro + histórico + gráficos) — próxima de onde `patient-clinical-overview.tsx` já vive.
- Datasets de referência OMS (0–5, 5–19) + Intergrowth-21, sex-specific, para as 4 curvas — estratégia de armazenamento à discrição do planner (D-01/D-03).
- Dependência nova de biblioteca de gráfico (não existe hoje).

</code_context>

<specifics>
## Specific Ideas

- Curvas como a **Caderneta da Criança** (percentis) são a referência mental do médico — daí percentil como leitura primária, com z-score disponível via toggle (D-12).
- ⚠️ **Tensão para o researcher (dados de referência):** carregar OMS 0–5 + OMS 5–19 + Intergrowth-21, × 2 sexos, × 4 indicadores é um volume relevante de dados de referência. Precisa de fonte oficial verificável, versionada, com faixa etária/fonte visível na UI (ver blocker registrado na STATE.md para Phase 3). Pesar acurácia vs esforço; possivelmente faseável por indicador se o volume pesar.
- ⚠️ **Reconciliação Intergrowth × idade corrigida (D-04):** o médico quer tanto Intergrowth (período de prematuro) quanto os dois pontos cronológico/corrigido na OMS. Researcher deve definir a regra de transição Intergrowth→OMS e como os dois pontos aparecem sem poluir o gráfico.

</specifics>

<deferred>
## Deferred Ideas

- **PDF/impressão da curva** — herdaria o builder `@falaped/falaped-kit/pdf`, mas plotar gráfico em PDF adiciona complexidade real; MVP fica só em tela. Iteração/fase futura.
- **Registro de medição dentro do fluxo do atendimento (caso)** — neste MVP só no perfil do paciente; integrar ao caso pode entrar depois.
- **Alertas/sinais automáticos de desvio de crescimento** (ex: queda de canal de percentil) — apoio à decisão mais avançado, fora do MVP.
- **Migrar/aposentar os campos scalar `weight`/`height`/`head_circumference`** para o histórico — decidido coexistir agora (D-08); unificar pode ser reavaliado numa fase futura.

</deferred>

---

*Phase: 3-curva-de-crescimento*
*Context gathered: 2026-07-09*
