---
task: 260823-r4t
title: "fix: Encerrar caso não abria a etapa 2 (AlertDialogAction = DialogPrimitive.Close)"
status: complete
branch: main
commit: d77227a
date: 2026-08-23
files-modified:
  - components/dashboard/cases/close-case-with-earnings-dialog.tsx
---

# 260823-r4t: a etapa 2 do lançamento nunca abria pelo botão Encerrar

## Problema

`Ações → Encerrar caso → Encerrar` encerrava o caso e o formulário "Registrar o
que foi cobrado" nunca aparecia.

## Causa raiz

`AlertDialogAction` do Radix **é** o `DialogPrimitive.Close`
(`@radix-ui/react-alert-dialog/dist/index.mjs:105-111`). O clique disparava
`onOpenChange(false)` no mesmo evento do `onClick={handleConfirmClose}`:
`handleOpenChange(false)` → `resetForm()` (`step` de volta para `"confirm"`) e
diálogo fechado, tudo antes do `loadEarningsStep()` assíncrono terminar. O
`setStep("earnings")` caía num diálogo já fechado e resetado. `if (isPending)
return` não protege: `isClosing` no closure daquele render ainda é `false` no
instante do clique.

Não era regressão do `facb4c1` (o fix de ancorar no ESTADO) — a etapa 2 nunca
apareceu por esse caminho desde o S3.

## Correção

Em `components/dashboard/cases/close-case-with-earnings-dialog.tsx`:

- `<AlertDialogAction onClick={handleConfirmClose}>Encerrar` →
  `<Button type="button" onClick={handleConfirmClose}>`, o mesmo padrão que o
  rodapé da etapa 2 do próprio arquivo já usava. Comentário no lugar dizendo por
  que não pode ser `AlertDialogAction`. `AlertDialogCancel` intacto.
- `AlertDialogAction` saiu do import (não é mais usado no arquivo).
- O `router.refresh()` que rodava logo após a etapa 2 abrir saiu do meio do
  fluxo e foi para o fechamento (`handleOpenChange`): com `cacheComponents` e o
  `Suspense` de `app/dashboard/cases/[id]/page.tsx`, refrescar o RSC com o
  diálogo aberto pode remontar o boundary e levar o diálogo embora; e fechar por
  Esc/Cancelar precisava de refresh para o cabeçalho refletir o encerramento.

## Varredura de causa raiz

Os outros 14 usos de `AlertDialogAction` no repo (reabrir caso/discussão,
excluir template, resetar cronômetro, limpar agenda, remover foto, aprovar
pendência) são fire-and-forget — nenhum depende de o diálogo continuar aberto
depois do clique. Nada mais a corrigir.

## Verificação

- `yarn typecheck` → `Done in 12.21s.` (sem erros)
- `yarn eslint` no arquivo → `Done in 2.45s.` (sem avisos)
- `yarn build` → FALHA por problema **pré-existente** de ambiente:
  `Cannot find module '../lightningcss.darwin-x64.node'` em
  `node_modules/lightningcss` (toolchain de CSS, arch mismatch no install). Sem
  relação com este diff; o dev server na :3000 roda normalmente.

## Escopo

Um arquivo. Nada em actions/modules/migrations. Sem alteração no ROADMAP.

## Self-Check: PASSED

- FOUND: components/dashboard/cases/close-case-with-earnings-dialog.tsx (modificado)
- FOUND: commit d77227a
