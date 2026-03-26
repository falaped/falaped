"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Separator } from "@/components/ui/separator"
import { formatRelativeTime } from "@/lib/formatters"
import {
  deleteReportTemplateAction,
  setActiveReportTemplateAction,
} from "@/actions"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"
import type { ReportTemplateOption } from "@/modules/report-templates/get-report-templates-by-profile-id"

type ReportTemplateTableProps = {
  templates: ReportTemplateOption[]
  activeTemplateId: string | null
}

export function ReportTemplateTable({
  templates,
  activeTemplateId,
}: ReportTemplateTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [activateId, setActivateId] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const templateToDelete = deleteId
    ? templates.find((t) => t.id === deleteId)
    : null
  const templateToActivate = activateId
    ? templates.find((t) => t.id === activateId)
    : null
  const templateToPreview = previewId
    ? templates.find((t) => t.id === previewId)
    : null

  async function handleConfirmDelete() {
    if (!templateToDelete) return
    setDeleting(true)
    const result = await deleteReportTemplateAction(templateToDelete.id)
    setDeleting(false)
    setDeleteId(null)
    if (result.ok) {
      toast.success("Template excluído.")
      router.refresh()
    } else {
      toast.error(getFriendlyToastMessage(result.error))
    }
  }

  async function handleConfirmActivate() {
    if (!templateToActivate || activeTemplateId === templateToActivate.id)
      return
    setActivating(true)
    const result = await setActiveReportTemplateAction(templateToActivate.id)
    setActivating(false)
    setActivateId(null)
    if (result.ok) {
      toast.success("Template ativado. Será usado nos próximos relatórios.")
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
            <TableHead className="w-[180px]">Tipo</TableHead>
            <TableHead className="w-[140px]">Criado</TableHead>
            <TableHead className="w-[80px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => {
            const isActive = activeTemplateId === template.id
            const canEdit = !template.is_default
            return (
              <TableRow
                key={template.id}
                className={cn(
                  isActive &&
                  "bg-primary/5 font-medium [&_td]:text-foreground",
                )}
              >
                <TableCell className="whitespace-nowrap font-medium">
                  {template.name}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {template.is_default && (
                      <Badge variant="secondary">Padrão do projeto</Badge>
                    )}
                    {isActive && (
                      <Badge
                        variant="default"
                        className="bg-primary text-primary-foreground"
                      >
                        Ativo
                      </Badge>
                    )}
                    {!template.is_default && !isActive && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
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
                      {!isActive && (
                        <>
                          <DropdownMenuItem
                            onClick={() => setActivateId(template.id)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Definir como ativo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={() => setPreviewId(template.id)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver estrutura
                      </DropdownMenuItem>
                      {canEdit && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/report-templates/${template.id}`}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteId(template.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <Sheet
        open={!!previewId}
        onOpenChange={(open) => !open && setPreviewId(null)}
      >
        <SheetContent side="right" className="flex flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Estrutura do template</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {templateToPreview?.sections?.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma seção definida.
              </p>
            ) : (
              <div className="space-y-3">
                {(templateToPreview?.sections ?? []).map((section, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium">
                      {section.name || "(sem título)"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {section.description || "(sem descrição)"}
                    </p>
                    {i < (templateToPreview?.sections?.length ?? 0) - 1 && (
                      <Separator className="mt-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!activateId}
        onOpenChange={(open) => !open && setActivateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar este template?</AlertDialogTitle>
            <AlertDialogDescription>
              Este template passará a ser usado como padrão nos próximos
              relatórios de atendimento. Você pode trocar depois em Perfil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activating}>
              Cancelar
            </AlertDialogCancel>
            <Button
              disabled={activating}
              onClick={handleConfirmActivate}
            >
              {activating ? "Ativando…" : "Ativar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Este template será removido. Se estiver em uso no seu perfil, o
              relatório passará a usar o padrão do projeto.
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
