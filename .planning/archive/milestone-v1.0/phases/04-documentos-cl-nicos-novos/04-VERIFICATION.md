---
phase: 04-documentos-cl-nicos-novos
verified: 2026-07-19T00:00:00Z
status: passed
human_verification_resolved: "2026-07-19 — usuário aprovou o UAT (\"tudo aprovado, ship\"). Migrations das waves 1-4 aplicadas + verificadas live via Supabase MCP nesta sessão; segurança 24/24 (threats_open: 0). UAT dos 5 fluxos de documento (PDF sem página em branco, catálogo/painéis, edição de orientação/marco, template save/reuse, não-regressão da receita normal) aprovado pelo usuário."
score: 5/5 must-haves verified (code-level)
behavior_unverified: 0
overrides_applied: 0
migrations_applied_live: "RESOLVED 2026-07-19 — o orquestrador aplicou e verificou TODAS as migrations das waves 1-4 ao DB live (project acstugafrgrqzvtuznxv) via Supabase MCP nesta sessão: referrals + referral_templates (RLS 4+4, bucket privado 4 storage policies); medical_reports + templates (idem); exam_requests + exam_request_templates + exam_catalog_items + exam_panels (idem); guidance_templates + guidance_documents (idem). Seeds per-profile confirmados por contagem: catálogo 13/perfil, painéis 2/perfil (Rotina lactente, Triagem escolar), orientações 10 marcos/perfil — apenas conteúdo aprovado. Versões reconciliadas aos timestamps dos arquivos. 04-05 não tem migration."
human_verification:
  - test: "Gerar cada doc (encaminhamento, relatório, pedido de exames, orientação, receituário em branco) → baixar PDF"
    expected: "PDF auto-preenchido com nome/DOB/idade do paciente, sem página em branco extra nem faixa de rodapé sobrando"
    why_human: "Renderização visual do PDF (página extra, layout) exige inspeção humana; herda Path B da Phase 1"
  - test: "Não-regressão do receituário normal + fluxo em branco"
    expected: "modo normal ainda exige min-1 medicamento; ?mode=blank gera receita de corpo vazio"
    why_human: "Comportamento visual/UX do wizard não verificável por grep"
  - test: "Editar um texto de orientação / adicionar um marco próprio; salvar/reutilizar templates"
    expected: "biblioteca de orientações e templates de encaminhamento/exames/relatório persistem e reaplicam"
    why_human: "Persistência real depende do DB live + interação de UI"
---

# Phase 04: Documentos Clínicos Novos — Verification Report

**Phase Goal:** O médico gera três novos tipos de documento (encaminhamento, pedido de exames, relatório médico) mais receituário em branco e uma biblioteca de orientações — cada um reaproveitando o padrão das receitas (wizard + template salvável + PDF), auto-preenchido com os dados do paciente e herdando o builder de PDF já corrigido na Phase 1.
**Verified:** 2026-07-19
**Status:** human_needed (código 100% verificado; itens humanos = apply de migrations ao DB live + UAT visual de PDF)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Médico gera encaminhamento (especialidade/motivo/resumo/urgência) e relatório médico de corpo livre, ambos com PDF auto-preenchido (nome/DOB/idade), sem página em branco extra | ✓ VERIFIED (code) | `modules/referrals/*` + `modules/medical-reports/*` completos; wizards com 12 refs de auto-fill (computePediatricAge/birthDate/patientName); PDF via `buildMedicalCertificatePdf`; relatório usa `RichTextEditor` de corpo único + `htmlToPlainTextForPdf`. "Sem página extra" = UAT visual (human) |
| 2 | Médico monta pedido de exames selecionando itens e gera PDF com hipótese/indicação e observações | ✓ VERIFIED (code) | `modules/exam-requests/*`; catálogo pesquisável (`exam-catalog-search.tsx`) + texto livre + painéis que expandem em itens editáveis removíveis (`aria-label="Remover exame"`, `panel.panel_items`); schema tem `hypothesis`/`observations`; PDF via `buildMedicalCertificatePdf` |
| 3 | Médico salva/reutiliza templates de encaminhamento, pedido de exames e relatório (padrão das receitas) | ✓ VERIFIED (code) | `modules/referral-templates/*`, `modules/medical-report-templates/*`, `modules/exam-request-templates/*` (create/get×2/delete, todos escopados por profile_id); wizards com apply de snapshot |
| 4 | Médico gera receituário em branco (layout de receita, corpo vazio) e seleciona/imprime orientações por marco | ✓ VERIFIED (code) | DOC-05: `blankMode` no `prescription-wizard.tsx` (pula guard min-1-medicamento, `canProceed = hasPatient \|\| blankMode`), rota `?mode=blank` threadada. DOC-06: `guidance_templates` (milestone como campo) + seed 10 marcos aprovados + doc imprimível auto-fill |
| 5 | Cada novo doc aplica gate `paid` e escopa leitura/escrita/exclusão por profile_id (sem acesso cross-tenant) | ✓ VERIFIED (code) | 23/23 actions com `status !== "paid"` (incl. generatePrescriptionAction — lacuna pré-existente fechada em 04-05 Task 1b); 9/9 delete modules com `.eq("profile_id")`; 4 delete specs provam no-op cross-tenant; download routes autenticados + `.eq("profile_id")`; storage path `{profileId}/{docId}.pdf` (foldername[1]) |

**Score:** 5/5 truths verificadas em código. Confirmação end-to-end (DB live + PDF visual) roteada para verificação humana.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `modules/{referrals,medical-reports,exam-requests,guidance}/*` | CRUD+PDF por domínio | ✓ VERIFIED | 12/11/12/12 arquivos; todos escopados por profile_id |
| `modules/{referral,medical-report,exam-request}-templates/*` + `modules/exam-{catalog,panels}/*` | templates + catálogo/painéis | ✓ VERIFIED | presentes; catálogo/painéis relacionais per-profile |
| `actions/*` (8 domínios) | actions com gate paid | ✓ VERIFIED | 23 actions, todas com gate paid |
| `app/dashboard/{referrals,medical-reports,exam-requests,guidance}/*` + rotas download | 1 rota top-level/doc | ✓ VERIFIED | 4 rotas + `?mode=blank`; build compila todas |
| `supabase/migrations/2026071000*..030*` | 20 migrations (tabela/RLS/storage/templates/seed) | ✓ VERIFIED (em disco) | 20 arquivos; 4 RLS policies/tabela; buckets public=false; seeds 13/2 e 10 marcos. Apply ao DB live = human |
| `components/app-sidebar.tsx` | 5 itens append-only | ✓ VERIFIED | Encaminhamentos, Relatórios médicos, Pedidos de exames, Orientações, Receituário em branco |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| generate-*-pdf modules | `@falaped/falaped-kit/pdf` | `buildMedicalCertificatePdf` (4/4) | ✓ WIRED |
| medical-report wizard | PDF | `RichTextEditor` → `htmlToPlainTextForPdf` → buildMCP | ✓ WIRED |
| exam wizard | payload | `exams: string[]` resolvidas (não ids) — Pitfall 5 | ✓ WIRED |
| generate actions | storage | path `{profileId}/{docId}.pdf` (foldername[1] RLS) | ✓ WIRED |
| download routes | DB | `getAuthenticatedUser` + `.eq("profile_id")` + signed URL 60s | ✓ WIRED |

### Anti-Patterns / Prohibitions

| Check | Result | Status |
|-------|--------|--------|
| `buildReportPdf` / `import pdfkit` em domínios novos | Só 1 hit — comentário JSDoc "Nunca pdfkit/buildReportPdf" em guidance (não é import) | ✓ CLEAN |
| medical_reports importa laudo (`report-templates`/`report-template-sections`) | NONE — domínio genuinamente separado (DOC-03) | ✓ CLEAN |
| AI-assist (Groq) no corpo do relatório (deferred) | NONE | ✓ CLEAN |
| Extração de exames por foto/IA (deferred) | NONE | ✓ CLEAN |
| Hub "Documentos" unificado (deferred) | NONE — rotas separadas (D-12) | ✓ CLEAN |
| Orientações-dentro-da-receita (deferred) | NONE — campo `orientations` do wizard é plain-text pré-existente (commit f938fa1, 2026-03-15), não a biblioteca DOC-06 | ✓ CLEAN |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Suite completa | `yarn test` | 460 pass / 0 fail (7 suites) | ✓ PASS |
| Typecheck | `yarn typecheck` | exit 0 | ✓ PASS |
| Build produção | `yarn build` | exit 0; 4 novas rotas compiladas | ✓ PASS |
| Delete specs cross-tenant | 4 spec files | no-op cross-tenant + storage error engolido | ✓ PASS |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| DOC-01 | Encaminhamento com PDF auto-preenchido | ✓ SATISFIED | domínio referrals completo, wizard specialty+urgência, PDF via kit |
| DOC-02 | Pedido de exames (catálogo + painéis) | ✓ SATISFIED | catálogo pesquisável + texto livre + painéis editáveis; seed 13+2 aprovado |
| DOC-03 | Relatório médico rich-text (separado do laudo) | ✓ SATISFIED | domínio medical_reports separado; RichTextEditor corpo único |
| DOC-04 | Templates encaminhamento/exames/relatório | ✓ SATISFIED | 3 domínios de template per-profile |
| DOC-05 | Receituário em branco | ✓ SATISFIED | blankMode do fluxo de receita + gate paid adicionado |
| DOC-06 | Biblioteca de orientações por marco | ✓ SATISFIED | guidance_templates (milestone campo) + seed 10 marcos + doc imprimível |

### Human Verification Required

1. **Apply de migrations ao DB live** — confirmar as 20 migrations (tabelas + RLS 4 policies + buckets privados + seeds per-profile) no project `acstugafrgrqzvtuznxv`. SUMMARY afirma "applied via MCP post-return" — não verificável neste sandbox (MCP Supabase não vinculado). SQL em disco está correto e completo.
2. **Gerar cada doc → PDF baixa sem página em branco** (herda Path B da Phase 1).
3. **Não-regressão do receituário normal** + fluxo `?mode=blank`.
4. **Editar orientação / adicionar marco / salvar-reutilizar templates** (depende do DB live).

### Gaps Summary

Nenhum gap de código. Todos os 6 requisitos DOC-01..06 têm implementação concreta e verificada: 20 migrations com RLS/storage privado corretos em disco, 23 actions com gate paid (incl. a lacuna pré-existente de generatePrescriptionAction fechada), IDOR consistentemente escopado por profile_id em delete/read/update + path de storage, payload de exames auto-contido, PDF exclusivamente via `buildMedicalCertificatePdf` (zero pdfkit/buildReportPdf reais), navegação append-only de 5 itens, e nenhuma ideia deferida vazada. Suite 460/460, typecheck e build verdes.

O status é `human_needed` (não `passed`) apenas porque dois fatos não são verificáveis por código neste ambiente: (a) a aplicação real das migrations ao DB live — o SUMMARY/prompt afirmam que o orquestrador aplicou via MCP, mas o servidor MCP Supabase não está vinculado a esta sessão para eu confirmar; e (b) o UAT visual do PDF (página em branco) e a não-regressão da receita. Esses são exatamente os checkpoints `checkpoint:human-verify` deferidos, não regressões.

---

_Verified: 2026-07-19_
_Verifier: Claude (gsd-verifier)_
