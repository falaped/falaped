# Requirements: Falaped — Milestone v1.1

**Defined:** 2026-06-04
**Core Value:** O médico documenta a consulta falando — e sai com ficha, relatório, receita e atestado prontos, sem digitação manual.

## v1.1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Segurança Multi-tenant (SEC)

- [ ] **SEC-01**: Médico só consegue deletar receitas/atestados do próprio perfil — deletes filtram por `profile_id` (fix do IDOR em `delete-prescription.ts` / `delete-medical-certificate.ts`)
- [ ] **SEC-02**: Todas as tabelas de dados públicas têm RLS habilitado com policies de ownership (enable + policies na mesma migration; anchor via `profiles.auth_user_id = auth.uid()`; `cases` via join `user_phone`)
- [ ] **SEC-03**: Admin client (service-role) não é usado em paths de delete acionados por usuário — storage deletado via client com RLS de usuário; admin restrito a `auth.admin.deleteUser`
- [ ] **SEC-04**: Bulk delete executa em lote único (`.in("id", ids)` + `storage.remove([...])` batch) sem estado parcial inconsistente em falha

### Higiene de Código (HYG)

- [ ] **HYG-01**: Cada recurso tem rota única de criação — duplicação `new`/`novo` eliminada (com redirect da rota removida)
- [ ] **HYG-02**: Todo acesso a variáveis de ambiente passa por `lib/env.ts` validado — sem `process.env.X!` direto
- [ ] **HYG-03**: Falhas em fluxos de geração/parsing são logadas com contexto — sem `catch {}` silencioso em paths críticos
- [ ] **HYG-04**: `@supabase/ssr` e `@supabase/supabase-js` pinados em semver explícito; scaffolds mortos removidos (dirs `consultation-audio` vazios, SQL manual fora de `migrations/`)

### Refatoração de Componentes (REF)

- [ ] **REF-01**: `new-case-workspace.tsx` decomposto — estado extraído em hooks testáveis antes do JSX, nenhum arquivo resultante >400 linhas
- [ ] **REF-02**: Wizards de receita e atestado decompostos com hooks de estado extraídos e testados
- [ ] **REF-03**: `send-case-assistant-message.ts` reduzido a orquestração fina sobre `modules/` — contrato `__FALAPED_JSON__` preservado

### Testes & CI (TEST)

- [ ] **TEST-01**: Actions de delete/generate têm testes de ownership (regressão do IDOR) e de caminhos de erro
- [ ] **TEST-02**: Criação, validação, expiração e revogação de tokens de share têm testes unitários
- [ ] **TEST-03**: CI roda typecheck, lint e test em todo push/PR com `yarn install --frozen-lockfile`

### Compartilhamento com Paciente (SHARE)

- [ ] **SHARE-01**: Médico gera link seguro de receita/atestado (token 256-bit `gen_random_bytes(32)`, com expiração) e copia para enviar ao paciente
- [ ] **SHARE-02**: Paciente abre `/share/[token]` — página pública com marca da clínica — e baixa o PDF sem conta; link multi-uso até expirar (download via route handler com signed URL curto, nunca URL de storage direta)
- [ ] **SHARE-03**: Médico revoga link a qualquer momento; primeiro acesso registrado em `accessed_at` (trilha LGPD mínima)
- [ ] **SHARE-04**: Médico vê expiração dos links ativos ("expira em N dias") e regenera link com 1 clique (revoga antigo + cria novo)

### Timeline do Paciente (TLINE)

- [ ] **TLINE-01**: Médico vê timeline cronológica unificada do paciente — casos, receitas e atestados mesclados em feed único agrupado por mês
- [ ] **TLINE-02**: Médico filtra a timeline por tipo de evento (consultas / receitas / atestados)
- [ ] **TLINE-03**: Linhas de documentos na timeline têm botão "Compartilhar" inline que gera o link seguro

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Compartilhamento

- **SHARE-05**: Envio do link por email/SMS (requer provedor transacional + trilha de consentimento LGPD)
- **SHARE-06**: Autenticação do paciente na página de share (requer sistema de identidade do paciente)

### Timeline

- **TLINE-04**: Relatórios de caso como 4º tipo de evento (requer decisão de nível de acesso a PHI)

### Documentos

- **DOC-01**: Assinatura digital ICP-Brasil nos PDFs (requer integração com certificadora)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Links permanentes sem expiração | Viola minimização de dados (LGPD) — nunca shipear |
| Agenda de consultas com lembretes | Feature grande; depois do hardening |
| Busca global no dashboard | Menor prioridade que segurança neste ciclo |
| Upload direto de áudio (presigned) | Limite de 25mb ainda aceitável; adiada |
| Bot WhatsApp | Repositório externo |
| Adoção de react-query | Padrão de dados atual é server components + actions; mudança exigiria decisão explícita |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 1 | Pending |
| HYG-04 | Phase 1 | Pending |
| TEST-03 | Phase 1 | Pending |
| HYG-01 | Phase 2 | Pending |
| HYG-02 | Phase 2 | Pending |
| HYG-03 | Phase 2 | Pending |
| REF-01 | Phase 2 | Pending |
| REF-02 | Phase 2 | Pending |
| REF-03 | Phase 2 | Pending |
| SHARE-01 | Phase 3 | Pending |
| SHARE-02 | Phase 3 | Pending |
| SHARE-03 | Phase 3 | Pending |
| SHARE-04 | Phase 3 | Pending |
| TLINE-01 | Phase 4 | Pending |
| TLINE-02 | Phase 4 | Pending |
| TLINE-03 | Phase 4 | Pending |
| TEST-01 | Phase 5 | Pending |
| TEST-02 | Phase 5 | Pending |

**Coverage:**
- v1.1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-04*
*Last updated: 2026-06-04 after roadmap creation (v1.1)*
