"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Save, Trash2 } from "lucide-react"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  createGuidanceTemplateAction,
  updateGuidanceTemplateAction,
  deleteGuidanceTemplateAction,
} from "@/actions"
import type { GuidanceTemplate } from "@/modules/guidance/types"

type GuidanceMilestoneManagerProps = {
  templates: GuidanceTemplate[]
}

/**
 * Gerenciador da biblioteca de marcos: editar o texto de cada marco,
 * adicionar marcos próprios e remover. O conteúdo é editável (seed aprovado);
 * o executor não preenche texto clínico — vem do seed/entrada do médico.
 */
export function GuidanceMilestoneManager({
  templates,
}: GuidanceMilestoneManagerProps) {
  const router = useRouter()
  const [bodies, setBodies] = useState<Record<string, string>>(() =>
    Object.fromEntries(templates.map((t) => [t.id, t.body])),
  )
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newMilestone, setNewMilestone] = useState("")
  const [newBody, setNewBody] = useState("")
  const [adding, setAdding] = useState(false)

  const templateToDelete = deleteId
    ? templates.find((t) => t.id === deleteId)
    : null

  async function handleSave(template: GuidanceTemplate) {
    const body = (bodies[template.id] ?? "").trim()
    if (!body) {
      toast.error("Informe o texto da orientação.")
      return
    }
    setSavingId(template.id)
    const result = await updateGuidanceTemplateAction({
      id: template.id,
      milestone: template.milestone,
      body,
      sortOrder: template.sort_order,
    })
    setSavingId(null)
    if (result.ok) {
      toast.success("Marco atualizado.")
      router.refresh()
    } else {
      toast.error(getFriendlyToastMessage(result.error))
    }
  }

  async function handleAdd() {
    const milestone = newMilestone.trim()
    const body = newBody.trim()
    if (!milestone) {
      toast.error("Informe o nome do marco.")
      return
    }
    if (!body) {
      toast.error("Informe o texto da orientação.")
      return
    }
    setAdding(true)
    const result = await createGuidanceTemplateAction({
      milestone,
      body,
      sortOrder: templates.length,
    })
    setAdding(false)
    if (result.ok) {
      toast.success("Marco adicionado.")
      setNewMilestone("")
      setNewBody("")
      setAddOpen(false)
      router.refresh()
    } else {
      toast.error(getFriendlyToastMessage(result.error))
    }
  }

  async function handleConfirmDelete() {
    if (!templateToDelete) return
    setDeleting(true)
    const result = await deleteGuidanceTemplateAction(templateToDelete.id)
    setDeleting(false)
    setDeleteId(null)
    if (result.ok) {
      toast.success("Marco excluído.")
      router.refresh()
    } else {
      toast.error(getFriendlyToastMessage(result.error))
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-foreground">
                  {template.milestone}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteId(template.id)}
                  aria-label={`Excluir marco ${template.milestone}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={bodies[template.id] ?? ""}
                onChange={(e) =>
                  setBodies((prev) => ({
                    ...prev,
                    [template.id]: e.target.value,
                  }))
                }
                rows={4}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSave(template)}
                  disabled={savingId === template.id}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {savingId === template.id ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-start">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar marco
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar marco</DialogTitle>
            </DialogHeader>
            <Field>
              <FieldLabel>Nome do marco</FieldLabel>
              <FieldContent>
                <Input
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  placeholder="Ex.: 15 meses"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Texto da orientação</FieldLabel>
              <FieldContent>
                <Textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Texto da orientação para este marco"
                  rows={5}
                />
              </FieldContent>
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleAdd} disabled={adding}>
                {adding ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open && deleting) return
          if (!open) setDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir marco?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O marco{" "}
              {templateToDelete ? `"${templateToDelete.milestone}"` : ""} será
              removido da sua biblioteca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
