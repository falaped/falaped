---
task: 260823-r4t
title: "fix: Encerrar caso não abria a etapa 2 (AlertDialogAction = DialogPrimitive.Close)"
mode: quick
date: 2026-08-23
---

# 260823-r4t: etapa 2 do lançamento nunca aparecia pelo botão Encerrar

## Sintoma relatado

"Encerrar caso abrir modal para reportar a parte financeira ainda não está
refletindo" — o caso encerra e nenhum formulário aparece.

## Causa raiz (confirmada, não é hipótese)

`AlertDialogAction` do Radix **é** o `DialogPrimitive.Close`:

```js
// node_modules/@radix-ui/react-alert-dialog/dist/index.mjs:105-111
var AlertDialogAction = React.forwardRef((props, forwardedRef) => {
  const { __scopeAlertDialog, ...actionProps } = props
  return jsx(DialogPrimitive.Close, { ...dialogScope, ...actionProps, ref: forwardedRef })
})
```

Logo, clicar em "Encerrar" dispara `onOpenChange(false)` no MESMO evento do
`onClick={handleConfirmClose}`: `handleOpenChange(false)` roda `resetForm()`, que
devolve `step` para `"confirm"` e fecha o diálogo — tudo isso ANTES do
`loadEarningsStep()` assíncrono terminar. `setStep("earnings")` acontece num
diálogo já fechado e resetado. A guarda `if (isPending) return` não protege:
`isClosing` no closure daquele render ainda é `false` no instante do clique.

Consequência: a etapa 2 nunca apareceu por esse caminho — não é regressão do
`facb4c1`, é o bug original do S3.

## Tarefas

1. Trocar o `AlertDialogAction` do botão "Encerrar" por `Button` puro (mesmo
   padrão que o rodapé da etapa 2 do próprio arquivo já usa), com comentário
   explicando por que não pode ser `AlertDialogAction`. `AlertDialogCancel`
   permanece — cancelar deve fechar mesmo.
2. Mover o `router.refresh()` do meio do fluxo (logo após a etapa 2 abrir) para
   o fechamento (`handleOpenChange`): com `cacheComponents` e o `Suspense` de
   `app/dashboard/cases/[id]/page.tsx`, refrescar o RSC com o diálogo aberto
   pode remontar o boundary e levar o diálogo embora; e fechar por Esc/Cancelar
   precisava de refresh para o cabeçalho refletir o encerramento.
3. Varredura de causa raiz: checar os outros usos de `AlertDialogAction` no
   repo — nenhum outro depende de o diálogo continuar aberto após o clique.

## Verificação

- `yarn typecheck`
- `yarn eslint` no arquivo alterado
