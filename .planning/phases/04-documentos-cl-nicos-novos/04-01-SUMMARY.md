---
phase: 04-documentos-cl-nicos-novos
plan: 01
subsystem: api
tags: [supabase, postgres, rls, storage, pdf, falaped-kit, next, react, zod, referrals]

# Dependency graph
requires:
  - phase: 03-crescimento-e-medidas
    provides: "padrão de action com gate paid + escopo profile_id (create-measurement)"
provides:
  - "Fatia vertical de encaminhamento (DOC-01): migration+RLS+storage, módulos CRUD/PDF, action com gate paid, rota top-level, wizard, card/table, item na sidebar"
  - "Template de encaminhamento salvável/reutilizável per-médico (DOC-04)"
  - "Esqueleto-molde para as fatias seguintes: constants REFERRALS_BUCKET, blocos append em actions/index.ts e app-sidebar.tsx"
affects: [04-02, 04-03, 04-04, 04-05, documentos-clinicos, pedido-de-exames, relatorio]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Clone do padrão prescriptions + prescription-templates para novos documentos clínicos"
    - "PDF de documento estruturado via buildMedicalCertificatePdf (título + corpo único), sem engine de PDF direto"
    - "IDOR anchor: mutação/leitura escopada .eq(id).eq(profile_id); delete spec prova no-op cross-tenant"

key-files:
  created:
    - supabase/migrations/20260710000000_referrals.sql
    - supabase/migrations/20260710000100_rls_referrals.sql
    - supabase/migrations/20260710000200_storage_referrals.sql
    - supabase/migrations/20260710000300_create_referral_templates.sql
    - lib/schemas/referral.ts
    - modules/referrals/*
    - modules/referral-templates/*
    - actions/referrals/*
    - actions/referral-templates/*
    - app/dashboard/referrals/*
    - app/api/referrals/[id]/download/route.ts
    - components/dashboard/referrals/*
  modified:
    - lib/constants.ts
    - actions/index.ts
    - components/app-sidebar.tsx

key-decisions:
  - "Wizard de encaminhamento single-step (specialty/motivo/resumo/urgência) em vez do 3-step com preview do receituário — documento mais simples"
  - "update-referral-pdf-path e template delete endurecidos com .eq(profile_id) (defesa em profundidade, além do analog prescriptions que era id-only)"
  - "urgency guardado no payload jsonb (Discretion-A) — sem coluna dedicada; badge semântico derivado no table"

patterns-established:
  - "Documento clínico novo = clonar prescriptions (módulos/action/rota/card/table) + medical-certificates (PDF título+corpo) + prescription-templates (snapshot)"
  - "Combobox base-ui com items + inputValue/onInputValueChange para picklist com free-text (D-07)"

requirements-completed: [DOC-01, DOC-04]

coverage:
  - id: D1
    description: "Migrations de referrals (tabela + trigger + índices), RLS (4 policies), storage bucket privado (4 policies) e referral_templates (tabela + RLS)"
    requirement: DOC-01
    verification:
      - kind: other
        ref: "ls supabase/migrations/*referral*.sql (4 arquivos) + greps RLS/foldername"
        status: pass
      - kind: manual_procedural
        ref: "Task 4 checkpoint (BLOCKING): aplicar as 4 migrations ao DB live via Supabase MCP e confirmar tabela+RLS+bucket privado+templates"
        status: unknown
    human_judgment: true
    rationale: "Aplicação real ao banco live (project acstugafrgrqzvtuznxv) pende do orquestrador — typecheck/build passam sem o DB live (tipos vêm do config), então a aplicação precisa de verificação humana/MCP"
  - id: D2
    description: "Módulos CRUD/PDF de referrals + referral-templates com escopo profile_id (D-15)"
    requirement: DOC-01
    verification:
      - kind: unit
        ref: "modules/referrals/delete-referral.spec.ts (no-op cross-tenant + storage error engolido)"
        status: pass
      - kind: other
        ref: "yarn tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D3
    description: "generateReferralAction com gate paid + escopo profile_id; PDF via buildMedicalCertificatePdf (título ENCAMINHAMENTO)"
    requirement: DOC-01
    verification:
      - kind: other
        ref: "grep 'status !== \"paid\"' actions/referrals/generate-referral.ts + grep buildMedicalCertificatePdf modules/referrals/generate-referral-pdf.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Rota /dashboard/referrals (list+new), download route owner-scoped 60s, wizard reusando picker+Combobox, card/table com badge de urgência, item na sidebar"
    requirement: DOC-01
    verification:
      - kind: other
        ref: "yarn eslint app/dashboard/referrals components/dashboard/referrals actions/referrals actions/referral-templates --max-warnings=0 + grep dashboard/referrals components/app-sidebar.tsx"
        status: pass
      - kind: manual_procedural
        ref: "Fluxo manual: gerar encaminhamento (auto-fill + avulso), PDF sem página em branco extra, salvar/reutilizar template — requer DB live (Task 4)"
        status: unknown
    human_judgment: true
    rationale: "Verificação de comportamento fim-a-fim (geração de PDF, download, template) depende das migrations aplicadas ao DB live"
  - id: D5
    description: "Template de encaminhamento salvável/reutilizável per-médico (DOC-04)"
    requirement: DOC-04
    verification:
      - kind: other
        ref: "yarn tsc --noEmit (createReferralTemplateAction/deleteReferralTemplateAction + snapshot apply no wizard)"
        status: pass
      - kind: manual_procedural
        ref: "Salvar como template e reutilizar em novo encaminhamento — requer DB live (Task 4)"
        status: unknown
    human_judgment: true
    rationale: "Persistência real do template depende das migrations aplicadas ao DB live"

# Metrics
duration: 35min
completed: 2026-07-19
status: complete
---

# Phase 04 Plan 01: Encaminhamento (DOC-01) + Template (DOC-04) Summary

**Fatia vertical de encaminhamento pediátrico: migration+RLS+storage privado, módulos CRUD/PDF via buildMedicalCertificatePdf, action com gate paid + escopo profile_id, rota top-level, wizard (Combobox especialidade + urgência), card/table com badge semântico e template reutilizável — clonando o padrão prescriptions.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3 de 4 (Task 4 = checkpoint BLOCKING de migration-apply, pendente do orquestrador)
- **Files modified/created:** 39

## Accomplishments
- 4 migrations de referrals (tabela+trigger+índices, RLS 4 policies, storage bucket privado + 4 policies keyed a foldername[1], referral_templates+RLS)
- Módulos referrals (insert/get×3/delete/delete-bulk/upload/update-pdf-path/body-segments/generate-pdf) + referral-templates (create/get×2/delete), todos escopados por profile_id
- generateReferralAction com gate paid explícito + PDF via buildMedicalCertificatePdf (título "ENCAMINHAMENTO", corpo único) — sem engine de PDF direto nem builder multi-seção
- delete-referral.spec.ts prova no-op cross-tenant + storage error engolido (D-15)
- Rota /dashboard/referrals (list+loading+new), download route owner-scoped com signed URL 60s, wizard reusando MedicalCertificatePatientPickerSheet + Combobox de especialidade (D-07) + Select de urgência (D-08), card/table com badge semântico de urgência, item "Encaminhamentos" na sidebar (D-12)

## Task Commits

1. **Task 1: Migrations + constants** - `4523489` (feat)
2. **Task 2: Módulos referrals + referral-templates + schema + delete spec** - `66c09e1` (feat)
3. **Task 3: Actions + rotas + wizard/card/table + sidebar** - `552754a` (feat)

**Plan metadata:** (docs commit — este SUMMARY)

## Migration apply order (pendente do orquestrador — Task 4 BLOCKING)

As 4 migrations foram escritas e commitadas mas NÃO aplicadas ao DB live (sem acesso a DB/MCP neste executor). O orquestrador deve aplicá-las via Supabase MCP `apply_migration` nesta ordem:

1. `supabase/migrations/20260710000000_referrals.sql` (tabela + trigger + índices)
2. `supabase/migrations/20260710000100_rls_referrals.sql` (RLS enable + 4 policies)
3. `supabase/migrations/20260710000200_storage_referrals.sql` (bucket privado + 4 storage policies)
4. `supabase/migrations/20260710000300_create_referral_templates.sql` (tabela + RLS)

Project Supabase: `acstugafrgrqzvtuznxv`.

## Files Created/Modified
- `supabase/migrations/20260710*.sql` (4) - tabela referrals, RLS, storage privado, referral_templates
- `lib/constants.ts` - REFERRALS_BUCKET (append após PRESCRIPTIONS_BUCKET)
- `lib/schemas/referral.ts` - referralPayloadSchema + generateReferralSchema (urgency enum default rotina, D-08)
- `modules/referrals/*` - CRUD, PDF (buildMedicalCertificatePdf), body-segments, upload/update-pdf-path, delete spec
- `modules/referral-templates/*` - create/get-by-profile/get-by-id-for-profile/delete + types
- `actions/referrals/*` + `actions/referral-templates/*` - actions com gate paid + escopo profile_id; barrels
- `actions/index.ts` - 2 blocos export append (referrals, referral-templates)
- `app/dashboard/referrals/*` - page, loading, new/page, wizard-wrapper, new-referral-link
- `app/api/referrals/[id]/download/route.ts` - owner-scoped 60s signed URL
- `components/dashboard/referrals/*` - referral-wizard, referral-card, referral-table
- `components/app-sidebar.tsx` - item Encaminhamentos no grupo Serviços (append)

## Decisions Made
- Wizard single-step (specialty/motivo/resumo/urgência) em vez de 3-step com preview — o encaminhamento é mais simples que o receituário; mantidos os seams reutilizáveis (picker, manual sheet, template save/apply).
- `update-referral-pdf-path` e `delete-referral-template` endurecidos com `.eq("profile_id", profileId)` — o analog prescriptions era id-only nesses dois pontos; aqui aplicamos defesa em profundidade conforme o plano.
- `urgency` guardado no payload jsonb (Discretion-A) — sem coluna dedicada; badge semântico (secondary/default/destructive) derivado no table.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Falso-positivo do grep de verificação por token no JSDoc**
- **Found during:** Task 3 (verify command)
- **Issue:** A verificação `! grep -q "import pdfkit\|buildReportPdf" modules/referrals/generate-referral-pdf.ts` falhava porque o JSDoc continha as palavras `pdfkit`/`buildReportPdf` num comentário "NEVER ..." (não havia import real).
- **Fix:** Reescrito o comentário do JSDoc para não conter os literais, mantendo o import correto de `buildMedicalCertificatePdf`.
- **Files modified:** modules/referrals/generate-referral-pdf.ts
- **Verification:** grep agora passa; import de buildMedicalCertificatePdf presente; typecheck OK.
- **Committed in:** `552754a`

**2. [Rule 1 - Bug] Lint: import/prop não usados + eslint-disable redundante no wizard**
- **Found during:** Task 3 (eslint)
- **Issue:** `getProfileDefaultLocation` importado mas não usado, prop `profile` destruturada mas não usada, e um `eslint-disable react-hooks/exhaustive-deps` desnecessário.
- **Fix:** Removido o import não usado, removida a destruturação de `profile` (o prop continua no tipo, passado pelo wrapper), removido o disable redundante.
- **Files modified:** components/dashboard/referrals/referral-wizard.tsx
- **Verification:** eslint --max-warnings=0 limpo nos 4 diretórios.
- **Committed in:** `552754a`

---

**Total deviations:** 2 auto-fixed (1 blocking de verificação, 1 bug de lint)
**Impact on plan:** Correções necessárias para verificação/lint limpos. Sem scope creep.

## Issues Encountered
- Nenhum bloqueio funcional. Task 4 (aplicar migrations ao DB live) é BLOCKING e não pôde ser executada aqui por falta de acesso a DB/MCP — delegada ao orquestrador.

## User Setup Required
**Requer configuração externa (Supabase).** As 4 migrations de referrals precisam ser aplicadas ao banco live (project `acstugafrgrqzvtuznxv`) via Supabase MCP `apply_migration`, na ordem: referrals → rls_referrals → storage_referrals → create_referral_templates. Sem isso, typecheck/build passam com falso-positivo (tipos vêm do config), mas o fluxo de encaminhamento não funciona no runtime.

## Next Phase Readiness
- Molde estabelecido (constants bucket, blocos append em actions/index.ts e app-sidebar.tsx, padrão módulo/action/rota/wizard/card/table) para as fatias 04-02..04-05.
- Blocker: migration-apply (Task 4) pendente antes de qualquer verificação de comportamento fim-a-fim.

## Self-Check: PASSED

Todos os 12 arquivos-chave verificados no disco e os 3 commits de task (`4523489`, `66c09e1`, `552754a`) presentes no histórico.

---
*Phase: 04-documentos-cl-nicos-novos*
*Completed: 2026-07-19*
