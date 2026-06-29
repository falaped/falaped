---
phase: quick-260629-egq
plan: 01
subsystem: patients-photo
tags: [patients, photo, ux, dialog, supabase, lgpd]
status: complete
requires:
  - modules/patients/get-patient-by-id.ts (referência de colunas do SELECT)
  - modules/patients/get-patients-photo-signed-urls.ts (signed URLs em lote)
  - modules/patients/get-patient-photo-signed-url.ts (signed URL singular)
  - components/ui/dialog.tsx (shadcn Dialog)
provides:
  - foto do paciente exibida na lista (BUG 2)
  - avatar de edição com foto persistente após refresh (BUG 1)
  - fluxo de upload/troca de foto em Dialog (BUG 3)
affects:
  - lista de pacientes (PatientsContent / PatientsTable)
  - edição de paciente (PatientDetailView / PatientForm)
tech-stack:
  added: []
  patterns:
    - "router.refresh() pós-upload re-resolve signed URL server-side (sem object-URL efêmero)"
    - "object-URL revogado via URL.revokeObjectURL (cleanup + ao trocar/limpar) para não vazar memória"
    - "Dialog controlado (useState open) fecha programaticamente após sucesso"
key-files:
  created: []
  modified:
    - modules/patients/get-patients-by-profile-id.ts
    - components/dashboard/patients/patient-form/patient-form.tsx
    - components/dashboard/patients/patient-detail-view.tsx
    - components/dashboard/patients/patient-form/patient-form-photo-field.tsx
decisions:
  - "Preview da imagem selecionada usa <img> com eslint-disable pontual (object-URL local efêmero, não otimizável por next/image)"
  - "statusLabel duplicado por contexto: dentro do Dialog (otimizando/enviando) e fora (removendo, com Dialog fechado)"
metrics:
  duration: 15min
  completed: 2026-06-29
  tasks: 3
  files: 4
---

# Quick 260629-egq: Correção de 3 pontos da foto do paciente — Summary

Três defeitos da foto do paciente corrigidos: a lista volta a exibir fotos (SELECT corrigido), o avatar de edição mostra a foto e persiste após refresh (threading da signed URL + `router.refresh()`), e o upload/troca de foto agora acontece dentro de um shadcn `Dialog` — preservando avatar, botão de abrir e o `AlertDialog` de remoção.

## What Was Built

### Task 1 — BUG 2: `photo_path` no SELECT da lista (commit `9141743`)
- `getPatientsByProfileId` agora seleciona `gestational_age_weeks, photo_path, consent_given, consent_at`, alinhando as colunas com `get-patient-by-id.ts`.
- `patients-content.tsx` já montava `paths` a partir de `p.photo_path` e gerava signed URLs em lote; com a coluna presente, `PatientsTable` passa a renderizar a foto em vez das iniciais.
- Filtro `.eq("profile_id", profileId)` e assinatura inalterados — scoping por `profile_id` preservado.

### Task 2 — BUG 1: threading da signed URL + refresh pós-upload (commit `9ce7bfc`)
- `PatientFormProps` (variante `edit`) recebe `photoUrl?: string | null`; o ramo de edição passa `initialPhotoUrl: props.photoUrl` ao `PatientFormPersonalSection` (que já repassava ao campo de foto).
- `patient-detail-view.tsx` encaminha o `photoUrl` (já resolvido server-side em `patient-detail-content.tsx`) ao `<PatientForm mode="edit">`.
- `patient-form-photo-field.tsx`: `useRouter().refresh()` após upload e remoção bem-sucedidos, para o servidor re-resolver a signed URL real e injetá-la via `initialPhotoUrl`. Object-URL local revogado (`URL.revokeObjectURL`) ao trocar arquivo, ao limpar e no unmount. Um `useEffect` sincroniza `previewUrl`/`hasPhoto` com `initialPhotoUrl` quando não há arquivo pendente — tornando a signed URL a fonte da verdade pós-refresh.

### Task 3 — BUG 3: upload/troca em Dialog (commit `87468f8`)
- Fluxo de upload movido para um shadcn `Dialog` (`@/components/ui/dialog`): seletor de arquivo, preview, checkbox de consentimento, botão `Salvar foto` e `statusLabel` vivem dentro do `DialogContent`.
- Fora do modal: o `Avatar`, o botão que abre o modal (`Trocar foto`/`Enviar foto` como `DialogTrigger`) e o `AlertDialog` de remoção (preservado integralmente, incluindo título/descrição PT-BR e `handleRemove`).
- Estado de abertura controlado (`useState`): fecha programaticamente após sucesso; bloqueia fechamento enquanto ocupado; reseta seleção e re-exige consentimento (D-06) ao abrir/fechar e em `handleFileChange`.
- `DialogHeader`/`DialogTitle`/`DialogDescription` com título "Foto do paciente". A lógica de compressão/action (`uploadPatientPhotoAction`) e remoção permanece inalterada — apenas reposicionamento de UI.

## Deviations from Plan

None — plano executado conforme escrito. Decisão menor de implementação: o preview da imagem selecionada usa `<img>` com `eslint-disable-next-line @next/next/no-img-element` pontual (é um object-URL local efêmero, não otimizável por `next/image`); o lint do arquivo tocado fica limpo.

## Verification Results

- **`yarn typecheck`**: PASS — `tsc --noEmit`, sem erros.
- **`yarn test`**: PASS — 402/402 testes (7 suites), 0 falhas. Specs de módulo (`update-patient-photo.spec.ts`, `delete-patient.spec.ts`) não afetados.
- **`yarn lint` (arquivos tocados)**: CLEAN — `eslint` nos 4 arquivos modificados retorna 0 problemas. (As 4 warnings do `yarn lint` global são pré-existentes em `profile-content.tsx`, `case-report.tsx`, `nav-user.tsx` — fora do escopo desta tarefa.)

Verificação manual (não bloqueante, recomendada ao usuário): lista exibe fotos; abrir paciente com foto e editar mostra o avatar; refresh na edição persiste o avatar; `Enviar`/`Trocar foto` abre o modal com seletor + consentimento + Salvar; salvar fecha o modal e a foto aparece; remover confirma via AlertDialog.

## Convenções CLAUDE.md

PT-BR nas strings; named exports; três camadas preservadas (mudança de SELECT em `modules/`, UI em `components/`); nenhum client Supabase construído em `modules/`; nenhum `next/cache`/`next/headers` em `modules/`; gate auth/paid e scoping por `profile_id` inalterados; 2-space indent, double quotes.

## Commits

| Task | Commit | Tipo | Descrição |
|------|--------|------|-----------|
| 1 | `9141743` | fix | photo_path no SELECT da lista (BUG 2) |
| 2 | `9ce7bfc` | fix | threading da signed URL + router.refresh() (BUG 1) |
| 3 | `87468f8` | feat | upload/troca de foto em Dialog (BUG 3) |

## Self-Check: PASSED

- Arquivos modificados existem em disco: 4/4 FOUND.
- Commits presentes no histórico: `9141743`, `9ce7bfc`, `87468f8` — todos FOUND em `git log`.
