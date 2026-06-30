---
phase: quick-260629-egq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - modules/patients/get-patients-by-profile-id.ts
  - components/dashboard/patients/patient-form/patient-form.tsx
  - components/dashboard/patients/patient-detail-view.tsx
  - components/dashboard/patients/patient-form/patient-form-photo-field.tsx
autonomous: true
requirements: [PHOTO-FIX]
must_haves:
  truths:
    - "Na lista de pacientes, pacientes com foto exibem a foto (não as iniciais)."
    - "No modo edição, o avatar mostra a foto atual do paciente mesmo após refresh da página."
    - "Após enviar/trocar uma foto no modo edição, o servidor re-resolve uma signed URL real (sem depender do object-URL efêmero do cliente)."
    - "Clicar em Enviar foto / Trocar foto abre um modal contendo seletor de arquivo, preview, checkbox de consentimento e botão Salvar foto."
    - "Consentimento é re-exigido a cada nova foto (D-06); o botão de remover com seu AlertDialog continua funcionando."
  artifacts:
    - modules/patients/get-patients-by-profile-id.ts
    - components/dashboard/patients/patient-form/patient-form.tsx
    - components/dashboard/patients/patient-detail-view.tsx
    - components/dashboard/patients/patient-form/patient-form-photo-field.tsx
  key_links:
    - "PatientsContent.photo_path -> PATIENT_SELECT (lista) -> getPatientsPhotoSignedUrls -> PatientsTable.photoUrl"
    - "PatientDetailContent.photoUrl -> PatientDetailView -> PatientForm(edit).photoUrl -> photo.initialPhotoUrl -> PatientFormPhotoField.initialPhotoUrl"
    - "uploadPatientPhotoAction success -> router.refresh() -> servidor re-resolve signed URL"
---

<objective>
Corrigir três defeitos da foto do paciente (causa raiz já confirmada por leitura de código):

- BUG 2 — a foto não aparece na lista de pacientes porque `PATIENT_SELECT` da query de lista não traz `photo_path`.
- BUG 1 — no modo edição, o avatar volta às iniciais no refresh porque a signed URL do servidor nunca é injetada no `PatientFormPhotoField` (`initialPhotoUrl` fica indefinido).
- BUG 3 — UX: o envio/troca de foto deve acontecer dentro de um modal (shadcn Dialog), deixando fora apenas o avatar e o botão que abre o modal (preservando o botão de remover e seu AlertDialog).

Purpose: a foto do paciente é um dado clínico/sensível que precisa aparecer de forma consistente (lista, hero, edição) e o fluxo de upload precisa de uma UX clara.
Output: SELECT da lista corrigido, threading da signed URL até o campo de foto + `router.refresh()` pós-upload, e o campo de foto reorganizado em um Dialog.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

# Fonte da verdade dos defeitos (leituras já feitas):
@modules/patients/get-patients-by-profile-id.ts
@modules/patients/get-patient-by-id.ts
@modules/patients/types.ts
@components/dashboard/patients/patients-content.tsx
@components/dashboard/patients/patient-detail-content.tsx
@components/dashboard/patients/patient-detail-view.tsx
@components/dashboard/patients/patient-form/patient-form.tsx
@components/dashboard/patients/patient-form/patient-form-personal-section.tsx
@components/dashboard/patients/patient-form/patient-form-photo-field.tsx
@components/ui/dialog.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: BUG 2 — incluir photo_path no SELECT da lista de pacientes</name>
  <files>modules/patients/get-patients-by-profile-id.ts</files>
  <action>
No `PATIENT_SELECT` de `getPatientsByProfileId`, adicionar as colunas ausentes que o tipo `Patient` já declara e que `patients-content.tsx` consome: `photo_path`, `consent_given`, `consent_at` e `gestational_age_weeks`. Alinhar a string de SELECT com a de `modules/patients/get-patient-by-id.ts` (mesmas colunas, mesma ordem). Mudança mínima de uma única string; nada de novas funções, nada de novos arquivos. A query continua escopada por `.eq("profile_id", profileId)` — não alterar o filtro nem a assinatura. Resultado: `patients-content.tsx` passa a montar `paths` a partir de `p.photo_path` preenchido, gerando signed URLs em lote e exibindo a foto na lista (`PatientsTable` já consome `patient.photoUrl`).
  </action>
  <verify>
    <automated>yarn typecheck</automated>
  </verify>
  <done>`PATIENT_SELECT` de `getPatientsByProfileId` inclui `photo_path, consent_given, consent_at, gestational_age_weeks`; `yarn typecheck` passa; `yarn test` continua verde.</done>
</task>

<task type="auto">
  <name>Task 2: BUG 1 — threading da signed URL até o campo de foto + refresh pós-upload</name>
  <files>components/dashboard/patients/patient-form/patient-form.tsx, components/dashboard/patients/patient-detail-view.tsx, components/dashboard/patients/patient-form/patient-form-photo-field.tsx</files>
  <action>
Três alterações coordenadas para que a signed URL resolvida no servidor chegue ao avatar de edição e sobreviva ao refresh.

(a) `patient-form.tsx`: na variante `edit` de `PatientFormProps`, adicionar a prop opcional `photoUrl?: string | null`. No `<PatientFormPersonalSection>` do ramo de edição (atualmente monta `photo={{ patientId, patientName }}`), incluir `initialPhotoUrl: props.photoUrl`. `PatientFormPersonalSection` já aceita e repassa `photo.initialPhotoUrl` para `PatientFormPhotoField` — não mudar a seção.

(b) `patient-detail-view.tsx`: o componente já recebe `photoUrl` (usado no hero). Passar essa mesma prop para o `<PatientForm mode="edit" ...>` do ramo de edição: `photoUrl={photoUrl}`. Não mudar a resolução server-side (continua em `patient-detail-content.tsx`).

(c) `patient-form-photo-field.tsx`: importar `useRouter` de `next/navigation` e obter `const router = useRouter()`. Após o upload bem-sucedido (`result.ok` em `handleUpload`), chamar `router.refresh()` para que o servidor re-resolva uma signed URL real e a injete via `initialPhotoUrl`, em vez de depender do object-URL efêmero do cliente. O object-URL criado por `URL.createObjectURL(file)` deve ser revogado com `URL.revokeObjectURL` para não vazar memória — revogar o object-URL anterior antes de criar um novo em `handleFileChange` e ao limpar `selectedFile` após sucesso; após o refresh, `initialPhotoUrl` passa a ser a fonte da verdade do `previewUrl`. Manter a re-exigência de consentimento a cada nova foto (D-06) e toda a validação client (tipos/2MB) inalteradas.
  </action>
  <verify>
    <automated>yarn typecheck</automated>
  </verify>
  <done>`PatientFormProps` (edit) aceita `photoUrl`; `patient-form.tsx` passa `initialPhotoUrl: props.photoUrl`; `patient-detail-view.tsx` passa `photoUrl` ao `PatientForm` de edição; `patient-form-photo-field.tsx` chama `router.refresh()` após upload e revoga o object-URL; `yarn typecheck` passa e `yarn test` continua verde.</done>
</task>

<task type="auto">
  <name>Task 3: BUG 3 — mover o envio/troca de foto para um Dialog</name>
  <files>components/dashboard/patients/patient-form/patient-form-photo-field.tsx</files>
  <action>
Reorganizar o `PatientFormPhotoField` para que o fluxo de upload viva dentro de um shadcn `Dialog` (`@/components/ui/dialog` já existe — não adicionar via shadcn). Fora do Dialog permanece apenas: o `Avatar` (foto atual via `initialPhotoUrl`/preview, ou iniciais) e os controles soltos atuais reorganizados — o botão que ABRE o modal (rótulo `Trocar foto` quando há foto, `Enviar foto` quando não há) e o botão de remover com seu `AlertDialog` existente (preservar exatamente, incluindo título/descrição PT-BR e `handleRemove`).

Dentro do `DialogContent` (aberto pelo `DialogTrigger` no botão Enviar/Trocar foto):
- o `<input type="file">` (mantendo `accept`, validação client de tipo e 2MB, e `handleFileChange`);
- o preview da imagem selecionada;
- o checkbox de consentimento (label PT-BR atual);
- o botão `Salvar foto` (chama `handleUpload`, desabilitado sem consentimento ou enquanto `isBusy`);
- o `statusLabel` (Otimizando.../Enviando...).

Comportamento: ao concluir o upload com sucesso (já dispara `router.refresh()` da Task 2), fechar o Dialog e limpar `selectedFile`/`consent`. Usar estado controlado de abertura (`useState`) para poder fechar programaticamente. Re-exigir consentimento a cada nova foto (D-06): resetar `consent` para `false` ao abrir o Dialog e em `handleFileChange`. Strings em PT-BR; usar `<DialogHeader>`/`<DialogTitle>`/`<DialogDescription>` com título tipo "Foto do paciente" e descrição curta. Manter toda a lógica de upload/compressão/action (`uploadPatientPhotoAction`) e de remoção inalterada — apenas reposicionar a UI. Não introduzir bloco de código em comentário que repita literais negados por grep; manter comentários conceituais e PT-BR.
  </action>
  <verify>
    <automated>yarn typecheck && yarn lint components/dashboard/patients/patient-form/patient-form-photo-field.tsx</automated>
  </verify>
  <done>O seletor de arquivo, preview, checkbox de consentimento e botão Salvar foto vivem dentro de um `Dialog`; fora dele ficam só o avatar, o botão que abre o modal e o botão de remover (AlertDialog preservado); o Dialog fecha após sucesso; consentimento é re-exigido a cada foto; `yarn typecheck`, `yarn test` e `yarn lint` (arquivo tocado) ficam limpos.</done>
</task>

</tasks>

<verification>
Após as três tarefas:
- `yarn typecheck` passa (sem erros de tipo nas props novas de `PatientForm`/`PatientFormPersonalSection`).
- `yarn test` continua verde (specs de módulo `update-patient-photo.spec.ts` e `delete-patient.spec.ts` não são afetados — mudanças são de SELECT e de UI cliente).
- `yarn lint` limpo nos arquivos tocados.
- Verificação manual recomendada (não bloqueante): abrir a lista de pacientes (foto aparece), abrir um paciente com foto e editar (avatar mostra a foto), dar refresh na edição (avatar persiste), clicar Enviar/Trocar foto (abre modal com seletor + consentimento + Salvar), salvar (modal fecha e foto aparece), remover (AlertDialog confirma).
</verification>

<success_criteria>
- BUG 2: lista de pacientes exibe fotos para pacientes que possuem `photo_path`.
- BUG 1: avatar de edição mostra a foto atual e persiste após refresh; pós-upload o servidor re-resolve a signed URL via `router.refresh()`.
- BUG 3: upload/troca de foto acontece em um Dialog; avatar + botão de abrir + botão remover ficam fora; consentimento re-exigido (D-06); AlertDialog de remoção preservado.
- `yarn typecheck`, `yarn test`, `yarn lint` (arquivos tocados) limpos.
- Convenções CLAUDE.md respeitadas: PT-BR, named exports, sem construir client Supabase em módulos, sem `next/cache`/`next/headers` em `modules/`, gate auth/paid e scoping por `profile_id` inalterados.
</success_criteria>

<output>
Create `.planning/quick/260629-egq-corrigir-3-pontos-da-foto-do-paciente-1-/260629-egq-SUMMARY.md` when done
</output>
