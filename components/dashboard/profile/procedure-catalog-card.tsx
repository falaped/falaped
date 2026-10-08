"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  createProcedureCatalogItemAction,
  deleteProcedureCatalogItemAction,
  updateProcedureCatalogItemAction,
} from "@/actions"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { formatCentsToBRL } from "@/lib/formatters"
import { formatCentsToInputValue } from "@/lib/money"
import { procedureCatalogItemSchema } from "@/lib/schemas/procedure-catalog-item"
import type { ProcedureCatalogItemOption } from "@/modules/procedure-catalog/list-procedure-catalog-items"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/ui/field"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ProcedureCatalogCardProps = {
  /** O catálogo já carregado pelo RSC do Perfil, ordenado por nome. */
  items: ProcedureCatalogItemOption[]
}

/** Só a primeira mensagem interessa — é a que vai para o `FieldError` do campo. */
function firstIssue(name: string, price: string) {
  const parsed = procedureCatalogItemSchema.safeParse({ name, price })
  if (parsed.success) return null
  const issue = parsed.error.issues[0]
  return {
    field: issue?.path[0] === "price" ? ("price" as const) : ("name" as const),
    message: issue?.message ?? "Dados inválidos.",
  }
}

/** Catálogo em ordem de nome, como o RSC entrega — mantém a lista local igual à do servidor. */
function sortByName(list: ProcedureCatalogItemOption[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

/** `FieldError` espera objetos com `message`. */
function asErrors(message: string | null) {
  return message ? [{ message }] : undefined
}

/**
 * Editor do catálogo de procedimentos (S5, EARN-01), dentro do card `Preços` do Perfil.
 *
 * Estado e actions PRÓPRIOS — não entra no `useForm` do perfil: gate diferente (estes
 * actions exigem assinatura, o de perfil não), actions diferentes e ciclo de vida
 * diferente. A lista inicial vem do RSC; cada mutação atualiza a lista local na hora
 * (o `router.refresh()` re-renderiza o Perfil inteiro e demorava para mostrar o item) e
 * dispara o refresh em segundo plano, porque o `revalidatePath` do action sozinho não
 * basta com `cacheComponents` ligado. Quando o refresh chega, a lista volta a ser a do RSC.
 */
export function ProcedureCatalogCard({ items }: ProcedureCatalogCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  // Qual ação está no banco agora, para o spinner aparecer só no botão clicado.
  const [busy, setBusy] = useState<"add" | "edit" | "remove" | null>(null)
  const pendingAction = isPending ? busy : null
  const spinner = <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
  // Lista local; quando o RSC manda uma nova (após o refresh), ela substitui a local.
  const [list, setList] = useState(items)
  const [prevItems, setPrevItems] = useState(items)
  if (items !== prevItems) {
    setPrevItems(items)
    setList(items)
  }
  const addNameRef = useRef<HTMLInputElement>(null)

  const [addName, setAddName] = useState("")
  const [addPrice, setAddPrice] = useState("")
  const [addError, setAddError] = useState<{ field: "name" | "price"; message: string } | null>(null)

  // Apenas UMA linha editável por vez.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editError, setEditError] = useState<{ field: "name" | "price"; message: string } | null>(null)

  const [removing, setRemoving] = useState<ProcedureCatalogItemOption | null>(null)

  function startEditing(item: ProcedureCatalogItemOption) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditPrice(formatCentsToInputValue(item.price_cents))
    setEditError(null)
  }

  function discardEditing() {
    setEditingId(null)
    setEditError(null)
  }

  function handleAdd() {
    const issue = firstIssue(addName, addPrice)
    setAddError(issue)
    if (issue) return

    setBusy("add")
    startTransition(async () => {
      const result = await createProcedureCatalogItemAction({
        name: addName,
        price: addPrice,
      })
      if (!result.ok) {
        toast.error(getFriendlyToastMessage(result.error))
        return
      }
      const parsed = procedureCatalogItemSchema.parse({ name: addName, price: addPrice })
      setList((prev) =>
        sortByName([...prev, { id: result.itemId, name: parsed.name, price_cents: parsed.price }]),
      )
      setAddName("")
      setAddPrice("")
      toast.success("Procedimento adicionado.")
      router.refresh()
      // Foco de volta no nome para uma segunda entrada rápida.
      addNameRef.current?.focus()
    })
  }

  // O card fica dentro do <form> do perfil: Enter aqui salvaria o perfil, não o procedimento.
  function submitAddOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return
    e.preventDefault()
    if (!isPending) handleAdd()
  }

  function handleSaveEdit(id: string) {
    const issue = firstIssue(editName, editPrice)
    setEditError(issue)
    if (issue) return

    setBusy("edit")
    startTransition(async () => {
      const result = await updateProcedureCatalogItemAction(id, {
        name: editName,
        price: editPrice,
      })
      if (!result.ok) {
        toast.error(getFriendlyToastMessage(result.error))
        return
      }
      const parsed = procedureCatalogItemSchema.parse({ name: editName, price: editPrice })
      setList((prev) =>
        sortByName(
          prev.map((item) =>
            item.id === id ? { ...item, name: parsed.name, price_cents: parsed.price } : item,
          ),
        ),
      )
      setEditingId(null)
      toast.success("Procedimento atualizado.")
      router.refresh()
    })
  }

  function handleRemove(id: string) {
    setBusy("remove")
    startTransition(async () => {
      const result = await deleteProcedureCatalogItemAction(id)
      if (!result.ok) {
        toast.error(getFriendlyToastMessage(result.error))
        return
      }
      setList((prev) => prev.filter((item) => item.id !== id))
      setRemoving(null)
      toast.success("Procedimento removido.")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="divide-border divide-y overflow-hidden rounded-xl border border-border">
        {list.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm font-medium">Nenhum procedimento cadastrado.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione o primeiro na linha abaixo.
            </p>
          </div>
        )}

        {list.map((item) =>
          editingId === item.id ? (
            <div key={item.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  className="min-w-40 flex-1"
                  type="text"
                  autoComplete="off"
                  aria-label="Nome do procedimento"
                  aria-invalid={editError?.field === "name"}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") discardEditing()
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (!isPending) handleSaveEdit(item.id)
                    }
                  }}
                />
                <Input
                  className="w-32 tabular-nums"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="ex.: 120,00"
                  aria-label="Preço do procedimento (R$)"
                  aria-invalid={editError?.field === "price"}
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") discardEditing()
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (!isPending) handleSaveEdit(item.id)
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleSaveEdit(item.id)}
                >
                  {pendingAction === "edit" ? <>{spinner}Salvando…</> : "Salvar"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={discardEditing}
                >
                  Cancelar
                </Button>
              </div>
              <FieldError errors={asErrors(editError?.message ?? null)} />
            </div>
          ) : (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span className="shrink-0 font-medium num">
                {formatCentsToBRL(item.price_cents)}
              </span>
              <div className="flex shrink-0 items-center">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Editar procedimento"
                  disabled={isPending}
                  onClick={() => startEditing(item)}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remover procedimento"
                  disabled={isPending}
                  onClick={() => setRemoving(item)}
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ),
        )}

        {/* Linha de adicionar: sempre visível, inclusive com o catálogo vazio. */}
        <div className="flex flex-col gap-2 bg-muted/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              ref={addNameRef}
              className="min-w-40 flex-1"
              type="text"
              autoComplete="off"
              placeholder="Nome do procedimento"
              aria-label="Nome do procedimento"
              aria-invalid={addError?.field === "name"}
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={submitAddOnEnter}
            />
            <Input
              className="w-32 tabular-nums"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="ex.: 120,00"
              aria-label="Preço do procedimento (R$)"
              aria-invalid={addError?.field === "price"}
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              onKeyDown={submitAddOnEnter}
            />
            <Button type="button" size="sm" disabled={isPending} onClick={handleAdd}>
              {pendingAction === "add" ? <>{spinner}Adicionando…</> : "Adicionar"}
            </Button>
          </div>
          <FieldError errors={asErrors(addError?.message ?? null)} />
        </div>
      </div>

      <AlertDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open && !isPending) setRemoving(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover procedimento?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{removing?.name}&quot; sai do catálogo. Os lançamentos já
              registrados não mudam — eles guardaram o nome e o preço do momento da
              cobrança.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => removing && handleRemove(removing.id)}
            >
              {pendingAction === "remove" ? <>{spinner}Removendo…</> : "Remover"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
