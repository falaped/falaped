"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, MoreHorizontal, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatRelativeTime } from "@/lib/formatters"
import { deletePrescriptionTemplateAction } from "@/actions"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import type { PrescriptionTemplateOption } from "@/modules/prescription-templates/get-prescription-templates-by-profile-id"
import type { PrescriptionTemplateSnapshot } from "@/modules/prescription-templates/types"
import { stripHtml } from "@/lib/formatters"

type PrescriptionTemplateTableProps = {
  templates: PrescriptionTemplateOption[]
}

function PrescriptionTemplatePreviewContent({
  snapshot,
}: {
  snapshot: PrescriptionTemplateSnapshot
}) {
  const meds = snapshot.medications ?? []
  const orientations = snapshot.orientations?.trim()
  const warningSigns = snapshot.warningSigns?.trim()
  const additionalNotes = snapshot.additionalNotes?.trim()

  return (
    <div className="space-y-4 text-sm">
      {meds.length > 0 && (
        <div>
          <p className="font-medium text-foreground">Medicamentos</p>
          <ul className="mt-2 list-decimal space-y-2 pl-4 text-muted-foreground">
            {meds.map((m, i) => (
              <li key={i} className="leading-snug">
                <span className="font-medium text-foreground">{m.name}</span>
                {m.dosage?.trim() && ` — ${m.dosage}`}
                {m.posology?.trim() && ` · Posologia: ${m.posology}`}
                {m.duration?.trim() && ` · Duração: ${m.duration}`}
                {m.observations?.trim() && (
                  <span className="block pl-0 pt-0.5 text-xs">
                    Obs: {stripHtml(m.observations).trim()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {orientations && (
        <div>
          <p className="font-medium text-foreground">Orientações</p>
          <p className="mt-1 text-muted-foreground">
            {stripHtml(orientations)}
          </p>
        </div>
      )}
      {warningSigns && (
        <div>
          <p className="font-medium text-foreground">Sinais de alerta</p>
          <p className="mt-1 text-muted-foreground">
            {stripHtml(warningSigns)}
          </p>
        </div>
      )}
      {additionalNotes && (
        <div>
          <p className="font-medium text-foreground">Anotações adicionais</p>
          <p className="mt-1 text-muted-foreground">
            {stripHtml(additionalNotes)}
          </p>
        </div>
      )}
      {meds.length === 0 && !orientations && !warningSigns && !additionalNotes && (
        <p className="text-muted-foreground">Nenhum conteúdo no template.</p>
      )}
    </div>
  )
}

export function PrescriptionTemplateTable({
  templates,
}: PrescriptionTemplateTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const templateToDelete = deleteId
    ? templates.find((t) => t.id === deleteId)
    : null
  const templateToPreview = previewId
    ? templates.find((t) => t.id === previewId)
    : null

  async function handleConfirmDelete() {
    if (!templateToDelete) return
    setDeleting(true)
    const result = await deletePrescriptionTemplateAction(templateToDelete.id)
    setDeleting(false)
    setDeleteId(null)
    if (result.ok) {
      toast.success("Template excluído.")
      router.refresh()
    } else {
      toast.error(getFriendlyToastMessage(result.error))
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="w-[140px]">Criado</TableHead>
            <TableHead className="w-[80px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell className="max-w-[200px] truncate font-medium whitespace-nowrap">
                {template.name}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatRelativeTime(template.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Abrir ações"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-48">
                    <DropdownMenuItem
                      onClick={() => setPreviewId(template.id)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar preview
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteId(template.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet
        open={!!previewId}
        onOpenChange={(open) => !open && setPreviewId(null)}
      >
        <SheetContent
          side="right"
          className="flex flex-col sm:max-w-md overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>
              {templateToPreview?.name ?? "Preview do template"}
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
            {templateToPreview && (
              <PrescriptionTemplatePreviewContent
                snapshot={templateToPreview.snapshot}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Este template será removido. Você poderá criar outro a partir de
              uma receita quando quiser.
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
