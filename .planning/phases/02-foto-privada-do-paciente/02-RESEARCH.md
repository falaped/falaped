# Phase 2: Foto Privada do Paciente - Research

**Researched:** 2026-06-28
**Domain:** Supabase private Storage + signed URLs, client-side image compression, LGPD consent, ownership-scoped RLS (Next.js 16 / React 19 three-layer)
**Confidence:** HIGH

## Summary

Phase 2 anexa uma foto de identificação a cada criança, guarda-a num **bucket privado** novo e a exibe em três superfícies via **URL assinada de curta duração**. Quase toda a mecânica já existe no repositório como padrão maduro: o bucket privado `prescriptions` (migration `20260315010000_storage_prescriptions.sql`) é o **molde exato** de RLS escopada por `profile_id` (`public=false` + `(storage.foldername(name))[1] = profile_id`); a rota de download de receitas (`app/api/prescriptions/[id]/download/route.ts`) é o **molde exato** de geração de signed URL com `createSignedUrl(path, 60)` server-side; e `modules/profiles/upload-profile-logo.ts` é o **molde exato** de validação de tipo/tamanho + `upsert`. O trabalho é **adaptar esses três moldes** (logo é público → a foto é privada; PDF é download → a foto é exibida inline em `<img>`), não inventar nada novo. [VERIFIED: codebase grep]

A única peça verdadeiramente nova é a **compressão no cliente** (D-09, plano Free sem Image Transformations) e o **batch de signed URLs na lista** (`patients-table.tsx`). Ambas têm solução concreta: `browser-image-compression` para o primeiro, e `createSignedUrls` (plural — confirmado em storage-js 2.108.2) para o segundo, resolvido **uma vez no server component da lista** e passado como prop, evitando N+1. [VERIFIED: npm registry][VERIFIED: codebase grep]

Os três componentes de UI (`patient-detail-hero.tsx`, `patients-table.tsx`, `case-patient-info.tsx`) já usam o shadcn `Avatar` com `AvatarFallback` (iniciais). Adicionar a foto é **acrescentar `<AvatarImage src={signedUrl} />`** — o fallback automático do Radix cobre o caso "sem foto". Como esses avatares usam `<img>` (Radix), **não** `next/image`, as signed URLs do Supabase funcionam direto **sem** alterar `next.config.ts`. [VERIFIED: codebase grep]

**Primary recommendation:** Clonar o trio de padrões privados (`prescriptions` bucket RLS + rota de signed URL + `upload-profile-logo` validação), comprimir no cliente com `browser-image-compression` antes do upload, guardar `photo_path`/`consent_given`/`consent_at` em **colunas novas em `patients`**, resolver signed URLs **no server** (singular no hero/caso, batch `createSignedUrls` na lista) e adicionar `<AvatarImage>` aos três avatares existentes. Habilitar RLS de storage no novo bucket E manter o filtro explícito `profile_id` em todo módulo (defense-in-depth — o app não tem RLS de tabela por padrão; ver CONCERNS).

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Bucket **novo e privado** (`public=false`). NÃO reutilizar `profile-logos` (público) nem `getPublicUrl`. Adicionar a constante do bucket em `lib/constants.ts`.
- **D-02:** Servir por **URL assinada de curta duração** (`createSignedUrl`). Guardar no banco o **caminho do objeto** (ex: `${profile_id}/${patient_id}.jpg`), NÃO a URL.
- **D-03:** Escopo por `profile_id` em todo read/write/delete (path prefixado por `profile_id`) + **RLS de storage** + gate `paid` no action novo. Critério: `curl` não autenticado ao objeto deve **falhar**.
- **D-04:** **Checkbox obrigatório bloqueante** no momento do upload (texto: "Confirmo o consentimento do responsável para armazenar esta foto"). Sem tela/modal dedicado.
- **D-05:** Gravar **`consent_given` (boolean) + `consent_at` (timestamp)** como prova mínima auditável. Snapshot do texto NÃO entra no MVP.
- **D-06:** Consentimento **re-exigido ao substituir** a foto.
- **D-07:** **Upload de arquivo simples** — input clássico, SEM atributo `capture`. Validar tipo (PNG/JPEG/WebP) e tamanho, no espírito de `upload-profile-logo.ts`.
- **D-08:** **Uma única foto por criança, substituível** (`upsert` no mesmo path). Sem histórico/galeria.
- **D-09:** Supabase **Free** → SEM Image Transformations nativas. **Comprimir/redimensionar no cliente** antes do upload (ex: `browser-image-compression`, alvo ~1–2 MB). NÃO depender de transform-on-the-fly.
- **D-10:** Foto em **três superfícies**: (1) hero (`patient-detail-hero.tsx`), (2) miniatura na lista (`patients-table.tsx`), (3) cabeçalho do caso (`case-patient-info.tsx`).
- **D-11:** **Avatar circular com fallback** (iniciais/ícone quando não há foto).
- **D-12:** Divergência consciente da Fase 1: a foto SIM aparece na lista (reconhecimento rápido, propósito diferente do badge de idade).

### Claude's Discretion
- Tamanho/dimensões exatas do avatar por contexto (hero vs miniatura vs cabeçalho do caso).
- Modelo de dados exato (colunas em `patients` vs tabela dedicada), desde que: caminho no banco, `consent_given`+`consent_at`, e delete remova objeto + referência.
- Parâmetros de compressão (qualidade/dimensão máxima) e TTL exato da URL assinada.

### Deferred Ideas (OUT OF SCOPE)
- Histórico/galeria de fotos por paciente — fora do MVP.
- Captura via câmera in-app (`getUserMedia`) — só upload de arquivo agora.
- Snapshot do texto/versão do termo de consentimento — adiado (MVP grava flag + timestamp).
- Image Transformations / transform-on-the-fly — indisponível no Free; reavaliar se migrar para Pro.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PHOTO-01 | Médico pode enviar uma foto na identificação de cada criança | `uploadPatientPhoto` module adaptado de `upload-profile-logo.ts` (validação tipo/tamanho + `upsert`); compressão cliente com `browser-image-compression`; input de arquivo + checkbox de consentimento no `patient-form` |
| PHOTO-02 | A foto é exibida no perfil/identificação | `<AvatarImage src={signedUrl}>` nos três avatares existentes (hero, tabela, caso); URL resolvida server-side via `createSignedUrl`/`createSignedUrls` |
| PHOTO-03 | Armazenamento privado, escopo `profile_id`, URL assinada, não reusar bucket de logos | Bucket novo `public=false` (molde `prescriptions`); RLS de storage `(storage.foldername(name))[1] = profile_id`; path (não URL) no banco; gate `paid` no action; teste `curl` |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Upload + validação de tipo/tamanho/auth | API / Backend (action `"use server"` + module) | — | Gate `paid` + escopo `profile_id` só são confiáveis no server; module recebe `SupabaseClient` injetado |
| Compressão/redimensionamento da imagem | Browser / Client | — | D-09: Free não tem transform server-side; comprimir no cliente economiza storage e banda antes do upload |
| Geração da signed URL | API / Backend (server component / route handler) | — | A URL só pode ser assinada com sessão autenticada; nunca gerar no cliente (não há sessão de storage no browser para objetos privados via path) |
| Persistência de `photo_path`/consentimento | Database / Storage (module `modules/patients/`) | — | Colunas em `patients`; module com filtro `profile_id` + RLS de tabela ausente (defense via app layer) |
| Isolamento por dono (privacidade) | Database / Storage (RLS de storage) | API (filtro `profile_id` no module) | Critério `curl` falha = RLS no bucket; app-layer filter é o backstop porque tabelas não têm RLS |
| Exibição do avatar | Browser / Client (componente) | Frontend Server (resolve a URL e passa por prop) | `<AvatarImage>` Radix renderiza `<img>` no cliente; a URL vem pré-assinada do server |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.108.2 (já instalado) | Storage upload, `createSignedUrl`, `createSignedUrls`, `remove` | Já é o client do projeto; `storage-js` 2.108.2 inclui o batch `createSignedUrls` [VERIFIED: codebase grep — node_modules/@supabase/storage-js/dist/index.d.cts:1261] |
| `browser-image-compression` | 2.0.2 | Comprimir/redimensionar a foto no cliente antes do upload (D-09) | ~1.18M downloads/semana, MIT, repo público `github.com/Donaldcwl/browser-image-compression`, sem postinstall; padrão de facto para client-side image compression em React [ASSUMED — slopcheck indisponível nesta sessão; ver Package Legitimacy Audit] |
| `zod` | ^4.3.6 (já instalado) | Validar o payload do upload no action (tipo/tamanho/consentimento) | Já é o validador de boundary do projeto |
| shadcn `Avatar` / `AvatarImage` / `AvatarFallback` | já instalado (`components/ui/avatar.tsx`) | Avatar circular com fallback automático (D-11) | Já usado nos três componentes-alvo; `AvatarImage` renderiza `<img>` (não `next/image`) → signed URL funciona sem config |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-hook-form` + `@hookform/resolvers` | já instalado | Estado do checkbox de consentimento + arquivo no `patient-form` | Já é o padrão de formulário; integrar o campo de foto/consentimento |
| `radix-ui` Checkbox | já instalado (`components/ui/checkbox.tsx` — verificar) | Checkbox bloqueante de consentimento (D-04) | Primitiva já disponível |
| `sonner` | já instalado | Toast de erro/sucesso no upload | Padrão de feedback do projeto |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `browser-image-compression` | `compressorjs` (also client-side) | Ambos maduros; `browser-image-compression` tem API mais simples (`imageCompression(file, options)`), suporte a Web Worker e `maxSizeMB`/`maxWidthOrHeight` que mapeiam direto em D-09. Mantenha `browser-image-compression`. |
| Compressão no cliente | Supabase Image Transformations (transform-on-the-fly) | INDISPONÍVEL no plano Free (D-09); decisão travada. Não considerar. |
| Colunas em `patients` | Tabela dedicada `patient_photos` | Tabela dedicada só vale a pena para histórico/galeria — explicitamente fora de escopo (D-08). Colunas em `patients` é mais simples, evita join, e o delete-cascade já existe. **Recomendado: colunas.** |
| `next/image` para o avatar | `<img>` via `AvatarImage` (atual) | `next/image` exigiria `images.remotePatterns` no `next.config.ts` para o host Supabase E quebraria com URLs assinadas (query string muda a cada assinatura, anula otimização). `AvatarImage` (Radix `<img>`) é o caminho certo. |

**Installation:**
```bash
yarn add browser-image-compression
```
> ⚠️ Projeto é **yarn-only** (`packageManager: yarn@1.22.22`, commit 556f6b8). NÃO usar `npm install`. [VERIFIED: codebase — package.json]

**Version verification:**
- `@supabase/supabase-js@2.108.2` — instalado; `createSignedUrls` confirmado em `storage-js` 2.108.2. [VERIFIED: codebase grep]
- `browser-image-compression@2.0.2` — latest na npm; publicado 2023-03-06; ~1.18M downloads/semana; MIT. Maduro/estável (não abandonado dado o volume). [VERIFIED: npm registry — npm view]

## Package Legitimacy Audit

> slopcheck **não pôde ser instalado** nesta sessão (pip install falhou silenciosamente, sem rede de pacotes Python). Por protocolo, o pacote externo é tagueado `[ASSUMED]` e o planner DEVE colocar um `checkpoint:human-verify` antes do `yarn add`.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `browser-image-compression` | npm | 1ª publicação 2017; 2.0.2 em mar/2023 | ~1.18M/semana | github.com/Donaldcwl/browser-image-compression | N/A (indisponível) | **Flagged [ASSUMED]** — planner adiciona checkpoint antes do install |
| `@supabase/supabase-js` | npm | já instalado no projeto | — | github.com/supabase/supabase-js | N/A | Aprovado (dependência existente) |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

**Evidência corroborante para `browser-image-compression` (mitiga a ausência do slopcheck):** existe na npm há ~9 anos, ~1.18M downloads semanais, licença MIT, repositório público no GitHub, `scripts.postinstall` ausente (nenhum script de instalação). Risco de slopsquatting muito baixo, mas o gate de verificação humana permanece por disciplina.

## Architecture Patterns

### System Architecture Diagram

```
                         UPLOAD (PHOTO-01)
  [patient-form.tsx]
   file input + consent checkbox (D-04, D-07)
        │ (cliente)
        ▼
  browser-image-compression  ── comprime p/ ~1–2MB, maxWidthOrHeight (D-09)
        │
        ▼ FormData(file, consent=true)
  uploadPatientPhotoAction "use server"
        │  getAuthenticatedUser → gate paid → zod.safeParse(consent===true)
        ▼
  modules/patients/upload-patient-photo.ts(supabase, profileId, patientId, blob)
        │  valida tipo/tamanho → upsert em `${profileId}/${patientId}.<ext>`
        ▼
  Supabase Storage  [bucket PATIENT_PHOTOS, public=false]   ◄── RLS: foldername[1]=profile_id
        │
        ▼
  modules/patients/update-patient-photo.ts → patients.photo_path, consent_given, consent_at
        │
        ▼ revalidatePath(/dashboard/patients[, /:id])


                         EXIBIÇÃO (PHOTO-02)
  Server Component (page / content / case detail)
        │  lê patient(s).photo_path
        ├── 1 paciente (hero, caso):  createSignedUrl(path, TTL)        → signedUrl
        └── N pacientes (lista):      createSignedUrls(paths[], TTL)    → signedUrl[]  (evita N+1)
        │
        ▼ prop: signedUrl
  <Avatar><AvatarImage src={signedUrl}/><AvatarFallback>{initials}</AvatarFallback></Avatar>
        (Radix <img>; fallback automático quando src ausente/expira)


                         DELETE (PHOTO-03 / critério 3)
  deletePatientAction → deletePatient(supabase, id, profileId)
        ├── storage.from(PATIENT_PHOTOS).remove([photo_path])   ← novo passo
        └── delete row em patients (.eq id .eq profile_id)
```

### Recommended Project Structure
```
lib/constants.ts                              # + PATIENT_PHOTOS_BUCKET = "patient-photos"
lib/compress-image.ts                         # wrapper de browser-image-compression (cliente) [opcional]
modules/patients/
├── upload-patient-photo.ts                   # novo: valida + upsert no bucket privado
├── delete-patient-photo.ts                   # novo: remove objeto do storage (idempotente)
├── update-patient-photo.ts                   # novo: grava photo_path/consent_given/consent_at
├── get-patient-photo-signed-url.ts           # novo: createSignedUrl(path, TTL)
├── get-patients-photo-signed-urls.ts         # novo: createSignedUrls(paths[], TTL) p/ a lista
├── delete-patient.ts                         # editar: remover objeto de storage antes do delete da row
└── types.ts                                  # editar: + photo_path, consent_given, consent_at
actions/patients/
└── upload-patient-photo.ts                   # novo: action "use server" (auth + paid + zod)
supabase/migrations/
├── <ts>_patients_add_photo.sql               # novo: colunas photo_path, consent_given, consent_at
└── <ts>_storage_patient_photos_rls.sql       # novo: bucket private + 4 policies (molde prescriptions)
components/dashboard/patients/
├── patient-detail-hero.tsx                   # editar: + <AvatarImage> (recebe signedUrl por prop)
├── patients-table.tsx                        # editar: + <AvatarImage> por linha (signedUrl no Patient)
└── patient-form/                             # editar: + campo de foto + checkbox de consentimento
components/dashboard/cases/case-patient-info.tsx  # editar: + avatar com <AvatarImage>
```

### Pattern 1: Bucket privado + RLS escopada por profile_id (molde `prescriptions`)
**What:** Bucket `public=false` com 4 policies (select/insert/update/delete) onde o primeiro segmento do path = `profile_id` do dono.
**When to use:** Sempre que objetos privados forem escopados por dono via path-prefix.
**Example:**
```sql
-- Source: supabase/migrations/20260315010000_storage_prescriptions.sql (molde exato; trocar nome do bucket)
insert into storage.buckets (id, name, public)
values ('patient-photos', 'patient-photos', false)
on conflict (id) do update set public = false;

create policy "Patient photos select own"
on storage.objects for select to authenticated
using (
  bucket_id = 'patient-photos'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);
-- repetir for insert (with check), for update (using), for delete (using)
```
> `(storage.foldername(name))[1]` extrai o primeiro segmento do path (`<profile_id>/<patient_id>.jpg` → `<profile_id>`). [VERIFIED: codebase — 3 migrations de storage usam exatamente esse predicado]

### Pattern 2: Geração de signed URL server-side (molde rota de receita)
**What:** Resolver a URL assinada no server (component ou route handler), com sessão autenticada, antes de passar ao cliente.
**When to use:** Hero e cabeçalho do caso (1 foto). TTL curto (60s no padrão atual; pode usar 60–300s).
**Example:**
```ts
// Source: app/api/prescriptions/[id]/download/route.ts (adaptado)
const { data: signed } = await supabase.storage
  .from(PATIENT_PHOTOS_BUCKET)
  .createSignedUrl(patient.photo_path, 60) // TTL curto (PHOTO-03)
const photoUrl = signed?.signedUrl ?? null
```

### Pattern 3: Batch de signed URLs na lista (resolve o N+1 — Open Question 1)
**What:** Em vez de N chamadas `createSignedUrl` (uma por linha), uma única `createSignedUrls(paths[], TTL)`.
**When to use:** `patients-table.tsx` / `patients-content.tsx` (server component que já busca todos os pacientes).
**Example:**
```ts
// Source: @supabase/storage-js 2.108.2 — index.d.cts:1261 (createSignedUrls)
const paths = patients.filter(p => p.photo_path).map(p => p.photo_path!)
const { data: signedList } = await supabase.storage
  .from(PATIENT_PHOTOS_BUCKET)
  .createSignedUrls(paths, 60) // 1 round-trip para todas as miniaturas
// signedList: { path, signedUrl, error }[] → mapear de volta por path
const urlByPath = new Map(signedList?.map(s => [s.path, s.signedUrl]) ?? [])
```
> **Recomendação concreta para Open Question 1:** assinar **em lote no server component** (`patients-content.tsx`, que já roda `getPatientsByProfileId` com sessão), montar um `Map<path, signedUrl>`, e passar a URL já resolvida em cada `Patient` para a `patients-table.tsx`. Isso concilia com o TTL curto da PHOTO-03 porque a página é server-rendered a cada navegação (a URL é gerada fresca no render). Evita lazy-load por linha (que multiplicaria requests). [VERIFIED: codebase grep — API existe; padrão server-component já em uso em `patients-content.tsx`]

### Pattern 4: Compressão no cliente antes do upload (D-09)
**What:** Reduzir dimensão e peso da imagem no browser antes de enviar ao Server Action.
**When to use:** No `patient-form`, no handler do file input, antes de montar o `FormData`.
**Example:**
```ts
// Source: github.com/Donaldcwl/browser-image-compression (README) [CITED]
import imageCompression from "browser-image-compression"

const compressed = await imageCompression(file, {
  maxSizeMB: 1.5,            // alvo ~1–2MB (D-09)
  maxWidthOrHeight: 1024,    // avatar não precisa de mais; reduz drasticamente o peso
  useWebWorker: true,
  fileType: "image/jpeg",    // normaliza saída (opcional)
})
// compressed é um File/Blob → anexar ao FormData
```
> Server Actions têm `bodySizeLimit: "25mb"` (`next.config.ts`), então mesmo sem compressão caberia; a compressão é para **storage + velocidade da signed URL**, não para o limite de body. [VERIFIED: codebase]

### Anti-Patterns to Avoid
- **Guardar a signed URL no banco:** ela expira (TTL curto) → links quebrados. Guardar **só o path** (D-02). Gerar a URL no render.
- **Usar `getPublicUrl` / bucket público:** quebra a privacidade (D-01, D-03). O critério `curl` exige `public=false`.
- **Usar `next/image` para o avatar:** exige `remotePatterns` e a query string da assinatura anula a otimização/cache. Usar `<AvatarImage>` (Radix `<img>`).
- **Gerar a signed URL no cliente:** o browser não tem como assinar um objeto privado por path com a sessão de storage. Resolver no server e passar por prop.
- **N+1 na lista:** uma `createSignedUrl` por linha. Usar `createSignedUrls` em lote.
- **Confiar só na RLS de storage para ownership de tabela:** o app NÃO tem RLS de tabela por padrão (CONCERNS). Manter `.eq("profile_id", profileId)` em todo módulo de patients (defense-in-depth).
- **Esquecer o `remove` no delete:** `delete-patient.ts` atual só apaga a row. O critério 3 exige remover **objeto + referência** — adicionar `storage.remove([photo_path])` antes (ou em conjunto com) o delete da row.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Comprimir/redimensionar imagem no browser | Canvas + `toBlob` + cálculo de qualidade manual | `browser-image-compression` | Resampling, orientação EXIF, Web Worker, e iteração até `maxSizeMB` são sutis e bugados na mão |
| Assinar N URLs da lista | Loop de `createSignedUrl` | `createSignedUrls(paths[], TTL)` | API batch nativa, 1 round-trip, já no storage-js instalado |
| Avatar com fallback de iniciais | `useState` + `onError` + img/div condicional | shadcn `Avatar`+`AvatarImage`+`AvatarFallback` | Radix faz o fallback automático quando a imagem falha/expira; já usado nos 3 alvos |
| Validação de tipo/tamanho | Regex/checks ad-hoc espalhados | Replicar o bloco de `upload-profile-logo.ts` (ALLOWED_TYPES + MAX_SIZE_BYTES) | Padrão já testado no projeto; mensagens PT-BR consistentes |
| Isolamento por dono no storage | Checagem de path na aplicação só | RLS de storage (molde `prescriptions`) | É o que faz o `curl` falhar (critério 2); aplicação sozinha não impede acesso direto ao objeto |

**Key insight:** Esta fase é 80% **replicação de padrões existentes** (bucket privado, signed URL, validação de upload) e 20% peças novas com soluções de prateleira (compressão cliente, batch de URLs). Construir custom aumenta superfície de bug em código de privacidade/LGPD — exatamente onde menos se quer risco.

## Common Pitfalls

### Pitfall 1: Signed URL expirada na lista com muitas linhas
**What goes wrong:** TTL curto + lista renderizada uma vez; se o usuário deixar a aba aberta, as miniaturas "somem" quando a URL expira.
**Why it happens:** A URL é gerada no render do server component e não se renova sozinha no cliente.
**How to avoid:** O fallback do `AvatarImage` (iniciais) cobre o estado expirado graciosamente. Aceitável no MVP. TTL de 60s é o padrão do projeto; pode subir para 300s na lista para reduzir o efeito sem comprometer a privacidade (a URL ainda não é pública e o objeto é `public=false`). Decisão de TTL é discrição do planner (CONTEXT).
**Warning signs:** Miniaturas trocam para iniciais após segundos com a aba parada.

### Pitfall 2: Delete que deixa objeto órfão no storage (viola critério 3)
**What goes wrong:** `delete-patient.ts` apaga a row mas o `.jpg` permanece no bucket → LGPD: dado sensível persiste após "exclusão".
**Why it happens:** O módulo atual só faz `delete().eq(id).eq(profile_id)`.
**How to avoid:** Antes (ou junto) do delete da row, ler o `photo_path` e chamar `storage.from(PATIENT_PHOTOS).remove([photo_path])`. Tornar idempotente (não falhar se o objeto não existir), como faz `delete-profile-logo.ts`. Usar o **client do usuário** (não o admin) — a RLS de storage permite o dono deletar o próprio objeto.
**Warning signs:** Listar o bucket após excluir um paciente ainda mostra o arquivo.

### Pitfall 3: IDOR no upload/update se faltar `.eq("profile_id")`
**What goes wrong:** Um médico autenticado anexa/atualiza foto na ficha de outro médico passando um `patient_id` alheio.
**Why it happens:** O app NÃO tem RLS de tabela por padrão (CONCERNS lista IDORs reais em prescriptions/certificates). A RLS de storage protege o **objeto** mas não a **coluna** em `patients`.
**How to avoid:** No `update-patient-photo`, filtrar `.eq("id", patientId).eq("profile_id", profileId)`. No path do storage, prefixar por `profile_id` (a RLS de storage então recusa path de outro dono). Threadar `profile.id` do action para o module — nunca confiar só no `patient_id` do cliente.
**Warning signs:** Teste de ownership (paciente de outro profile) consegue gravar `photo_path`.

### Pitfall 4: Consentimento não bloqueante ou não re-exigido
**What goes wrong:** Upload prossegue sem checkbox marcado; ou ao substituir a foto o consentimento não é pedido de novo (D-06).
**Why it happens:** Validação só no cliente, ou re-uso de `consent_given` antigo.
**How to avoid:** Validar `consent === true` no **action** com Zod (`z.literal(true)` ou refine), não só no form. Gravar `consent_at = now()` a cada upload (inclusive substituição). O checkbox deve resetar no fluxo de substituição.
**Warning signs:** Upload via action direto (sem o form) grava foto com `consent_given=false`.

### Pitfall 5: `next/image` quebrando a foto privada
**What goes wrong:** Se alguém trocar `<AvatarImage>` por `next/image`, o build falha (host não permitido) ou a imagem não carrega (assinatura na query string).
**Why it happens:** `next.config.ts` não tem `images.remotePatterns`; signed URLs mudam a cada render.
**How to avoid:** Manter `<AvatarImage>` (Radix `<img>`). Não adicionar `next/image` para avatares de foto privada.
**Warning signs:** Erro "hostname not configured under images" no build/runtime.

## Runtime State Inventory

> Fase é majoritariamente greenfield (feature nova), mas toca delete e migra schema. Inventário focado nos pontos de estado.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Bucket de fotos NÃO existe ainda; criar via migration. Colunas `photo_path`/`consent_given`/`consent_at` NÃO existem em `patients` (verificado em `types.ts`). | Migration de schema + migration de bucket/RLS |
| Live service config | Bucket é criado **por migration SQL** (`insert into storage.buckets`), igual aos buckets existentes — NÃO precisa de criação manual no Dashboard. Confirmar que a migration roda no ambiente. | Aplicar migration no Supabase do projeto |
| OS-registered state | None — não há tasks/cron/serviços de OS envolvidos. | none |
| Secrets/env vars | None novos. `NEXT_PUBLIC_SUPABASE_URL` + `PUBLISHABLE_KEY` já cobrem; signed URLs usam a sessão do usuário, não o service-role. | none |
| Build artifacts | `browser-image-compression` será adicionado ao `package.json`/`yarn.lock` — reinstalar deps após o `yarn add`. | `yarn install` |

**Nada encontrado em "OS-registered state" e "Secrets":** verificado — feature é app+storage, sem registros de OS nem novos segredos.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@supabase/supabase-js` (+ storage-js) | upload/signed URL/remove | ✓ | 2.108.2 | — |
| `createSignedUrls` (batch) | lista sem N+1 | ✓ | em storage-js 2.108.2 | loop de `createSignedUrl` (pior) |
| shadcn `Avatar`/`AvatarImage` | exibição | ✓ | `components/ui/avatar.tsx` | — |
| `browser-image-compression` | compressão cliente (D-09) | ✗ (a instalar) | 2.0.2 | upload sem compressão (cabe no `bodySizeLimit` 25mb, mas gasta storage) |
| Projeto Supabase (Storage + migrations) | bucket + RLS | ✓ (projeto existente) | — | — |
| yarn 1.x | instalar dep | ✓ | 1.22.22 (pinned) | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** `browser-image-compression` (instalar com `yarn add`; fallback = upload sem compressão, aceitável mas contraria a intenção de D-09).

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high`. Fase lida com **dado sensível de menores** (LGPD) → segurança é primeira classe aqui.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `getAuthenticatedUser(supabase)` no action (padrão existente) |
| V3 Session Management | yes | Sessão Supabase via cookie (`@supabase/ssr`); signed URL gerada com a sessão |
| V4 Access Control | **yes (crítico)** | RLS de storage `foldername[1]=profile_id` + filtro `.eq("profile_id")` no module + gate `profile.status==="paid"` |
| V5 Input Validation | yes | Zod no action (tipo MIME PNG/JPEG/WebP, tamanho, `consent===true`); validação também no module |
| V6 Cryptography | no (sem cripto custom) | URLs assinadas usam HMAC do próprio Supabase — não hand-roll |
| V8 Data Protection / Privacy | **yes (LGPD)** | Bucket privado; path (não URL) no banco; consentimento auditável (`consent_given`+`consent_at`); delete remove objeto + referência |

### Known Threat Patterns for Supabase Storage + Next.js Server Actions

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Acesso direto ao objeto sem auth (`curl`) | Information Disclosure | Bucket `public=false` + RLS de storage (critério 2 — o teste verifica isto) |
| IDOR (foto de paciente de outro médico) | Elevation of Privilege / Info Disclosure | Path prefixado por `profile_id` + `.eq("profile_id")` no upload/update/delete + RLS |
| Upload de tipo malicioso (não-imagem, SVG com script) | Tampering | Whitelist MIME (PNG/JPEG/WebP) no action E module; **não** permitir `image/svg+xml` |
| Foto persiste após "exclusão" (LGPD) | Repudiation / Privacy | `storage.remove([photo_path])` no delete-patient (critério 3) |
| Upload sem consentimento | Repudiation / Privacy | `consent===true` validado no action (Zod), não só no form; `consent_at` gravado |
| Signed URL vazando em log/cache | Information Disclosure | TTL curto; nunca persistir a URL; não logar a URL assinada |
| Body grande / DoS no upload | DoS | `bodySizeLimit: "25mb"` + compressão cliente + `MAX_SIZE_BYTES` no module |

### Teste de segurança verificável (critério de sucesso 2 — Open Question 6)

Plano concreto de teste manual/automatizável de que `curl` sem auth FALHA:
1. Fazer upload de uma foto autenticado; capturar o `photo_path` gravado (ex: `<profile_id>/<patient_id>.jpg`).
2. Montar a URL pública direta do objeto: `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/patient-photos/<path>`.
3. `curl -i "<url>"` SEM header de Authorization → deve retornar **400/403** (bucket privado), NÃO 200 com a imagem.
4. (Opcional) `curl -i "<url>"` com um JWT de outro usuário → deve falhar pela RLS.
5. Confirmar que a signed URL (com `?token=...`) retorna 200 só enquanto válida e 400 após expirar.
> Como `actions/`, `components/`, `app/` não têm testes (CONCERNS), este teste pode ser um **script de verificação manual documentado** no plano (checkpoint), já que `nyquist_validation: false` (sem suíte automatizada exigida). Um spec de ownership no module (`modules/`) é viável e recomendado (ver Validation Architecture).

## Code Examples

### Adicionar foto ao avatar do hero (recebendo signedUrl por prop)
```tsx
// Source: components/ui/avatar.tsx + patient-detail-hero.tsx (adaptado)
<Avatar className="h-20 w-20 ... sm:h-24 sm:w-24">
  {photoUrl ? <AvatarImage src={photoUrl} alt={`Foto de ${patient.name}`} /> : null}
  <AvatarFallback className="bg-primary/10 ...">{initials}</AvatarFallback>
</Avatar>
```

### Action de upload (padrão do projeto)
```ts
// Source: actions/profile/upload-profile-logo.ts (adaptado — privado + consentimento)
"use server"
export async function uploadPatientPhotoAction(formData: FormData): Promise<...> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") return { ok: false, error: "Perfil não ativo..." }

  const parsed = uploadPhotoSchema.safeParse({
    patientId: formData.get("patientId"),
    consent: formData.get("consent") === "true",
    file: formData.get("file"),
  })
  if (!parsed.success) return { ok: false, error: zodErrorMessage(parsed.error) }
  if (parsed.data.consent !== true) return { ok: false, error: "Consentimento obrigatório." }

  try {
    const path = await uploadPatientPhoto(supabase, profile.id, parsed.data.patientId, parsed.data.file)
    await updatePatientPhoto(supabase, parsed.data.patientId, profile.id, {
      photo_path: path, consent_given: true, consent_at: new Date().toISOString(),
    })
    revalidatePath(`/dashboard/patients/${parsed.data.patientId}`)
    revalidatePath("/dashboard/patients")
    return { ok: true, path }
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Erro ao enviar foto." } }
}
```

### Module de delete da foto no storage (idempotente)
```ts
// Source: modules/profiles/delete-profile-logo.ts (adaptado p/ bucket privado)
export async function deletePatientPhoto(supabase, profileId, photoPath) {
  if (!photoPath) return
  const { error } = await supabase.storage.from(PATIENT_PHOTOS_BUCKET).remove([photoPath])
  if (error) throw new Error(`[PATIENTS] Falha ao remover foto do storage: ${error.message}`)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Logo público + `getPublicUrl` | Bucket privado + `createSignedUrl` | Padrão já presente no projeto (`prescriptions`, `medical-certificates`) | Foto deve seguir o padrão privado, não o de logos |
| Loop de signed URLs | `createSignedUrls` (batch) | storage-js já suporta | Resolve N+1 da lista |
| Server-side image transform | Compressão cliente (Free não tem transform) | D-09 (plano Free) | Compressão no browser antes do upload |

**Deprecated/outdated:** nenhum padrão deprecado relevante. Confirmar que NÃO se copie o caminho público de `upload-profile-logo.ts`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `browser-image-compression@2.0.2` é legítimo e seguro | Standard Stack / Package Audit | Baixo — corroborado por 1.18M downloads/sem, MIT, repo público, sem postinstall; mas slopcheck não rodou → planner deve gate com `checkpoint:human-verify` antes do `yarn add` |
| A2 | Parâmetros de compressão `maxSizeMB: 1.5`, `maxWidthOrHeight: 1024` | Pattern 4 | Baixo — discrição do planner (CONTEXT); ajustável sem risco de segurança |
| A3 | TTL de 60s (singular) / 60–300s (lista) | Pitfall 1 | Baixo — discrição do planner; fallback de iniciais cobre expiração |
| A4 | Bucket criado por migration SQL roda no ambiente alvo | Runtime State | Médio — se o Supabase não aplicar `insert into storage.buckets` por migration, criar manualmente no Dashboard. Confirmar pipeline de migration do projeto |

## Open Questions

1. **TTL exato e estratégia de renovação na lista** — Recomendação: 60s singular, considerar 300s na lista; aceitar fallback de iniciais ao expirar (MVP). Discrição do planner.
2. **Migration de bucket aplica no ambiente?** — Os buckets existentes foram criados por migration (`insert into storage.buckets`). Verificar se o pipeline do projeto aplica essas migrations no Supabase remoto; se não, adicionar passo manual no Dashboard ao plano.
3. **`get-patient-by-id.ts` está com o `select` faltando `gestational_age_weeks`** (bug pré-existente, não desta fase) — ao adicionar `photo_path`/`consent_*` ao select, vale incluir as colunas que faltam de uma vez (decisão do planner).

## Validation Architecture

> `nyquist_validation: false` — sem suíte automatizada exigida. Mas o projeto roda `*.spec.ts` em `modules/` e `lib/` via `tsx --test` (`yarn test`), e CONCERNS recomenda testes de ownership. Validação aqui é **leve e focada**.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node test runner via `tsx --test` (`yarn test`) |
| Config file | none — glob em `package.json` (`modules/**/*.spec.ts`, `lib/**/*.spec.ts`) |
| Quick run command | `yarn test` |
| Typecheck | `yarn typecheck` (`tsc --noEmit`) |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Command | File |
|-----|----------|-----------|---------|------|
| PHOTO-03 | upload com `patient_id` de outro profile NÃO grava `photo_path` | unit (ownership) | `yarn test` | `modules/patients/update-patient-photo.spec.ts` (Wave 0) |
| PHOTO-03 | `curl` sem auth ao objeto FALHA (bucket privado) | manual / checkpoint | script `curl` documentado | checkpoint no plano (não automatizável sem infra) |
| PHOTO-01 | tipo não-imagem / >limite é rejeitado | unit | `yarn test` | `modules/patients/upload-patient-photo.spec.ts` (Wave 0) |
| critério 3 | delete remove objeto + referência | unit (mock storage) + manual | `yarn test` | cobrir em `delete-patient.spec.ts` (Wave 0) |

### Sampling Rate
- **Per task commit:** `yarn typecheck`
- **Per wave:** `yarn test`
- **Phase gate:** `yarn typecheck` + `yarn test` verdes; teste `curl` manual documentado (critério 2).

### Wave 0 Gaps
- [ ] `modules/patients/upload-patient-photo.spec.ts` — validação tipo/tamanho
- [ ] `modules/patients/update-patient-photo.spec.ts` — ownership por `profile_id`
- [ ] (opcional) cobrir remoção de objeto em `delete-patient` com mock de storage
- [ ] Checkpoint documentado: roteiro `curl` para o critério 2

## Sources

### Primary (HIGH confidence)
- Codebase grep — `modules/profiles/upload-profile-logo.ts`, `modules/profiles/delete-profile-logo.ts`, `app/api/prescriptions/[id]/download/route.ts`, `app/api/medical-certificates/[id]/download/route.ts`, `supabase/migrations/20260315010000_storage_prescriptions.sql`, `supabase/migrations/20260604000002_rls_patients.sql`, `supabase/migrations/20260228200000_storage_profile_logos_rls.sql`, `components/ui/avatar.tsx`, `components/dashboard/patients/*`, `components/dashboard/cases/case-patient-info.tsx`, `lib/constants.ts`, `next.config.ts`, `modules/patients/{types,delete-patient,update-patient,create-patient,get-patient-by-id}.ts`
- `node_modules/@supabase/storage-js/dist/index.d.cts:1261` — `createSignedUrls` signature (storage-js 2.108.2)
- `.planning/codebase/CONCERNS.md` — RLS de tabela ausente; IDORs reais; service-role em deletes
- `.planning/phases/02-foto-privada-do-paciente/02-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `CLAUDE.md`

### Secondary (MEDIUM confidence)
- `npm view browser-image-compression` — 2.0.2, MIT, repo público, 1.18M downloads/semana, sem postinstall

### Tertiary (LOW confidence)
- `browser-image-compression` README options (`maxSizeMB`, `maxWidthOrHeight`, `useWebWorker`) — conhecimento de treino + repo; parâmetros são discrição do planner

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Supabase/storage APIs verificadas no codebase e nos types; padrões privados já existem no repo
- Architecture: HIGH — três moldes diretos (bucket privado, signed URL route, upload validation) presentes e citados
- Pitfalls: HIGH — derivados de CONCERNS.md (IDORs reais) e do gap de delete observado em `delete-patient.ts`
- `browser-image-compression`: MEDIUM — verificado na npm, mas slopcheck indisponível → gate de verificação humana

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (stack estável; reverificar `browser-image-compression` antes do install)
