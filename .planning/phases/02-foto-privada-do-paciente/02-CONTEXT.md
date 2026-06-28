# Phase 2: Foto Privada do Paciente - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Entrega a foto de identificação de cada criança: o médico **anexa uma foto** ao paciente e a **vê na identificação/perfil**, com a foto guardada em **armazenamento privado** acessível só ao médico dono. Fecha a decisão de privacidade/LGPD (bucket privado, URL assinada de curta duração, caminho — não URL pública — no banco, escopo por `profile_id`, captura de consentimento, exclusão que remove objeto + referência) **antes** que qualquer atalho de "copiar o bucket público de logos" se espalhe. Cobre PHOTO-01, PHOTO-02, PHOTO-03.

**Fora desta fase:** histórico/galeria de fotos por paciente (uma única foto substituível neste ciclo), captura via câmera in-app, novos documentos clínicos (Fase 3), qualquer feature de vacina (Fases 4–5).

</domain>

<decisions>
## Implementation Decisions

### Privacidade / Storage (travado pelo ROADMAP + REQUIREMENTS — registrado aqui para os agentes downstream)
- **D-01:** Bucket **novo e privado** (`public=false`). **NÃO** reutilizar `profile-logos` (público) nem o padrão `getPublicUrl` de `modules/profiles/upload-profile-logo.ts`. Adicionar a constante do bucket em `lib/constants.ts`.
- **D-02:** Servir a foto por **URL assinada de curta duração** (`createSignedUrl`). Guardar no banco o **caminho do objeto** (ex: `${profile_id}/${patient_id}.jpg`), **não** a URL.
- **D-03:** Escopo por `profile_id` em todo read/write/delete (path prefixado por `profile_id`) + **RLS de storage** + gate `paid` no action novo. Critério de sucesso: um `curl` não autenticado ao objeto deve **falhar**.

### Consentimento (LGPD)
- **D-04:** **Checkbox obrigatório no momento do upload** que **bloqueia** o envio se não marcado (texto curto: "Confirmo o consentimento do responsável para armazenar esta foto"). Sem tela/modal dedicado.
- **D-05:** Gravar no banco **flag `consent_given` (boolean) + timestamp `consent_at`** como prova mínima auditável. (Snapshot do texto/versão do termo NÃO entra no MVP.)
- **D-06:** Consentimento é **re-exigido ao substituir** a foto (toda nova foto passa pelo mesmo checkbox).

### Anexo / Upload
- **D-07:** **Upload de arquivo simples** — input de arquivo clássico, **sem** o atributo `capture`. (Captura via câmera in-app fica fora deste ciclo.) Validar tipo (PNG/JPEG/WebP) e tamanho, no espírito de `upload-profile-logo.ts`.
- **D-08:** **Uma única foto por criança, substituível** — reenviar troca a foto anterior (`upsert` no mesmo path). Sem histórico/galeria.

### Processamento de Imagem
- **D-09:** Projeto Supabase está no plano **Free** → **sem Image Transformations nativas**. Estratégia confirmada: **comprimir/redimensionar no cliente antes do upload** (ex: `browser-image-compression`, alvo ~1–2 MB) para economizar storage e acelerar o carregamento das URLs assinadas. NÃO depender de transform-on-the-fly do Supabase.

### Exibição
- **D-10:** A foto aparece em **três superfícies**: (1) **hero/identificação do paciente** (`patient-detail-hero.tsx` — onde a idade da Fase 1 já aparece), (2) **miniatura na lista/tabela de pacientes** (`patients-table.tsx`), e (3) **cabeçalho do caso/atendimento** (junto de nome/idade/cronômetro).
- **D-11:** Forma = **avatar circular com fallback** (iniciais/ícone quando não há foto).
- **D-12:** ⚠️ **Divergência consciente da Fase 1** (que decidiu NÃO mostrar idade em listas): a **foto SIM** aparece na lista/tabela — é apoio de reconhecimento rápido, propósito diferente do badge de idade.

### Claude's Discretion
- Tamanho/dimensões exatas do avatar por contexto (hero vs miniatura de lista vs cabeçalho do caso), respeitando o design do dashboard.
- Modelo de dados exato do consentimento e da foto (colunas em `patients` vs tabela dedicada), desde que: caminho no banco, `consent_given`+`consent_at`, e delete remova objeto + referência.
- Parâmetros de compressão (qualidade/dimensão máxima) e TTL exato da URL assinada.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Fase / Requisitos
- `.planning/ROADMAP.md` §"Phase 2: Foto Privada do Paciente" — goal + 3 critérios de sucesso (upload+exibição; URL assinada + curl falha; delete remove objeto+ref + consentimento)
- `.planning/REQUIREMENTS.md` — PHOTO-01 (enviar foto), PHOTO-02 (exibir no perfil), PHOTO-03 (privado, escopo `profile_id`, URL assinada, não reusar bucket de logos)
- `.planning/PROJECT.md` — Constraint de privacidade (fotos de crianças = dado sensível; acesso escopado ao médico dono)

### Mapa do código
- `.planning/codebase/INTEGRATIONS.md` §"File Storage" — buckets existentes e onde os módulos de upload vivem; migrations de RLS de storage (`*_storage_*_rls.sql`)
- `.planning/codebase/ARCHITECTURE.md` — padrão 3 camadas `app → actions → modules`; gate `paid` + escopo `profile_id`
- `.planning/codebase/CONCERNS.md` — app **sem RLS de tabela por padrão**; todo slice novo precisa de filtro `profile_id` + gate `paid` + teste de ownership (Pitfall 5)
- `.planning/codebase/STRUCTURE.md`, `.planning/codebase/CONVENTIONS.md` — onde adicionar código novo e convenções

### Skills do projeto
- `.cursor/skills/storage-pdfs/SKILL.md` — padrão de Supabase Storage com signed URLs (analog mais próximo de "privado + URL assinada"; adaptar de PDFs para imagem)
- `.cursor/skills/supabase-falaped/SKILL.md` — onde/como criar queries (uma query por arquivo em `modules/{domain}`, client como 1º argumento)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `modules/profiles/upload-profile-logo.ts` — padrão de upload (validação de tipo/tamanho, `upsert`, path por `profile_id`). **Adaptar, NÃO copiar**: é bucket público + `getPublicUrl`; a foto exige bucket privado + `createSignedUrl`.
- `lib/constants.ts` — constantes de bucket (`PROFILE_LOGOS_BUCKET`, etc.). Adicionar a nova constante do bucket privado de fotos.
- `modules/patients/` — `create-patient.ts`, `update-patient.ts`, `get-patient-by-id.ts`, `delete-patient.ts`, `types.ts` (`Patient`). A foto e o consentimento ligam-se ao paciente; `delete-patient` precisa também limpar o objeto de storage.
- `components/dashboard/patients/patient-detail-hero.tsx` — hero onde a idade (Fase 1) aparece; ponto de inserção do avatar.
- `components/dashboard/patients/patients-table.tsx` — listagem; ponto de inserção da miniatura.
- `components/dashboard/patients/patient-form.tsx` — formulário do paciente; possível casa do input de foto + checkbox de consentimento.
- `supabase/migrations/20260604000002_rls_patients.sql` — padrão de RLS para escopo por `profile_id` (referência para RLS de storage do novo bucket).

### Established Patterns
- Upload: módulo recebe `SupabaseClient` por injeção, valida tipo/tamanho, `upsert` em path `${profileId}/...`.
- Action: `getAuthenticatedUser` → gate `paid` → Zod `safeParse` → delega a `modules/` → retorna union `{ ok }`.
- Sem RLS de tabela por padrão — exige filtro explícito `profile_id` + teste de ownership.

### Integration Points
- Novo bucket privado no Supabase Storage + migration de RLS de storage escopada por `profile_id`.
- Coluna(s) de foto/consentimento (em `patients` ou tabela dedicada — discrição do planner).
- Avatar em 3 superfícies de UI (hero, tabela, cabeçalho do caso) — todas precisam resolver a URL assinada.

</code_context>

<specifics>
## Specific Ideas

- "Foto do médico com a criança" (PROJECT.md) — a foto pode incluir o médico junto da criança; favorece avatar circular com recorte centralizado e talvez forma um pouco maior no hero.
- ⚠️ **Tensão para o pesquisador/planner — múltiplas URLs assinadas na lista:** exibir miniatura na `patients-table.tsx` significa gerar várias signed URLs de uma vez (potencial N+1 / latência). Resolver estratégia: assinar em lote no server, cache curto, ou lazy-load por linha. Pesar contra o TTL curto exigido pela PHOTO-03.
- Verificação de segurança (critério de sucesso 2): planejar um teste de que `curl` ao objeto sem autenticação **falha** (bucket `public=false`).

</specifics>

<deferred>
## Deferred Ideas

- **Histórico/galeria de fotos por paciente** (fotos de crescimento ao longo do tempo) — fora do MVP; possível fase futura. Neste ciclo: uma foto substituível.
- **Captura via câmera in-app** (`getUserMedia`) — fora do MVP; só upload de arquivo agora.
- **Snapshot do texto/versão do termo de consentimento** no banco — postura LGPD mais robusta; adiado (MVP grava flag + timestamp).
- **Image Transformations / transform-on-the-fly** — indisponível no plano Free; reavaliar se o projeto migrar para Pro.

</deferred>

---

*Phase: 2-foto-privada-do-paciente*
*Context gathered: 2026-06-28*
