---
status: complete
phase: 02-foto-privada-do-paciente
source:
  - 02-01-SUMMARY.md
  - 02-02-SUMMARY.md
  - 02-03-PLAN.md (committed, SUMMARY pendente — anomalia mark-and-skip)
  - quick/260629-egq (3 correções de exibição/UX da foto)
started: 2026-06-29T14:10:00.000Z
updated: 2026-06-29T14:10:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold start — app sobe e a lista de pacientes carrega
expected: Com o app rodando, /dashboard/patients carrega sem erro e lista os pacientes; cada linha tem um avatar circular (foto ou iniciais).
result: pass

### 2. Foto aparece na lista (BUG 2 corrigido)
expected: Para um paciente que TEM foto, a miniatura aparece no avatar circular da lista (não as iniciais). Antes do fix a query da lista não trazia photo_path; agora traz.
result: pass

### 3. Foto no perfil (hero)
expected: Abrir a ficha de um paciente com foto. O hero mostra a foto no avatar grande; paciente sem foto mostra as iniciais.
result: pass

### 4. Upload em modal (BUG 3 — UX)
expected: Na edição do paciente, clicar em "Enviar foto"/"Trocar foto" abre um MODAL (Dialog) contendo o seletor de arquivo + preview + checkbox de consentimento + botão "Salvar foto". Fora do modal fica só o avatar e os botões.
result: pass

### 5. Gate de consentimento
expected: Dentro do modal, selecionar uma imagem mas NÃO marcar o consentimento → "Salvar foto" fica bloqueado/erro pedindo o consentimento. Marcar o consentimento habilita o salvar.
result: pass

### 6. Upload com consentimento persiste
expected: Selecionar imagem + marcar consentimento + Salvar → toast "Foto atualizada", o modal fecha e o avatar passa a mostrar a foto.
result: pass

### 7. Foto persiste após refresh na edição (BUG 1 corrigido)
expected: Após upload, dar refresh (F5) na página de edição → o avatar continua mostrando a foto (não volta para as iniciais). Antes do fix voltava ao padrão porque a signed URL não era injetada no servidor.
result: pass

### 8. Remoção de foto (PHOTO-03)
expected: Com foto presente, acionar remover → AlertDialog de confirmação → confirmar → toast "Foto removida", avatar volta às iniciais. Em refresh continua sem foto (objeto + referência no DB removidos).
result: pass

### 9. Foto no cabeçalho do caso
expected: Abrir um caso/consulta de um paciente com foto → o cabeçalho do caso mostra a foto do paciente (signed URL singular). Sem foto → iniciais.
result: pass

### 10. Segurança — acesso não autenticado negado (PHOTO-03 critério 2)
expected: Requisição não autenticada a um objeto do bucket patient-photos retorna 400/403 (não 200) — bucket privado.
result: pass
source: automated
note: curl sem token → HTTP 400 nas rotas /object/public e /object de patient-photos (verificado 2026-06-29).

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
