"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, Pencil, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { ReportTemplateOption } from "@/modules/report-templates/get-report-templates-by-profile-id"
import { deleteReportTemplateAction, setActiveReportTemplateAction } from "@/actions"
import { formatRelativeTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { useState } from "react"

export function ReportTemplateList({
  templates,
  activeTemplateId,
}: {
  templates: ReportTemplateOption[]
  activeTemplateId: string | null
}) {
  const userTemplates = templates.filter((t) => !t.is_default)
  const hasOnlyDefault = userTemplates.length === 0

  return (
    <div className="flex flex-col gap-4">
      {hasOnlyDefault ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Nenhum template seu</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie um template para usar nos relatórios de atendimento.
            </p>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
        {templates.map((t) => (
          <ReportTemplateCard
            key={t.id}
            template={t}
            isActive={activeTemplateId === t.id}
          />
        ))}
      </div>
    </div>
  )
}

function ReportTemplateCard({
  template,
  isActive,
}: {
  template: ReportTemplateOption
  isActive: boolean
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteReportTemplateAction(template.id)
    setIsDeleting(false)
    if (result.ok) {
      setDeleteOpen(false)
      toast.success("Template excluído.")
      router.refresh()
      return
    }
    toast.error(getFriendlyToastMessage(result.error))
  }

  async function handleActivate() {
    if (isActive) return
    setIsActivating(true)
    const result = await setActiveReportTemplateAction(template.id)
    setIsActivating(false)
    if (result.ok) {
      toast.success("Template ativado. Será usado nos próximos relatórios.")
      router.refresh()
      return
    }
    toast.error(getFriendlyToastMessage(result.error))
  }

  const canEdit = !template.is_default
  const sections = template.sections ?? []

  return (
    <Card
      className={cn(
        "relative overflow-visible",
        isActive && "ring-2 ring-primary border-primary",
      )}
    >
      <CardContent className="p-4 pt-5">
        {/* Legend: badges acima do conteúdo */}
        {(template.is_default || isActive) && (
          <div className="-mt-7 mb-3 flex flex-wrap gap-1.5" role="status">
            {template.is_default && (
              <Badge variant="secondary">Padrão do projeto</Badge>
            )}
            {isActive && (
              <Badge variant="outline" className="border-primary text-primary">
                Ativo
              </Badge>
            )}
          </div>
        )}
        {/* Título + ações na mesma linha */}
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-base font-semibold">
            {template.name}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {!isActive && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleActivate}
                    disabled={isActivating}
                  >
                    {isActivating ? "Ativando…" : "Ativar"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  Definir como template ativo para os relatórios
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  aria-label="Ver estrutura do template"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                Ver estrutura do template
              </TooltipContent>
            </Tooltip>
            <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
              <SheetContent side="right" className="flex flex-col sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Estrutura do template</SheetTitle>
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                  {sections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma seção definida.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sections.map((section, i) => (
                        <div key={i}>
                          <p className="text-sm font-medium">
                            {section.name || "(sem título)"}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {section.description || "(sem descrição)"}
                          </p>
                          {i < sections.length - 1 && (
                            <Separator className="mt-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            {canEdit && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" asChild aria-label="Editar template">
                      <Link href={`/dashboard/report-templates/${template.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    Editar template
                  </TooltipContent>
                </Tooltip>
                {!isActive && (
                  <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Excluir template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        Excluir template
                      </TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Este template será removido. Se estiver em uso no seu
                          perfil, o relatório passará a usar o padrão do projeto.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault()
                            handleDelete()
                          }}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? "Excluindo…" : "Excluir"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
        </div>
        {/* Subtitle: data de criação */}
        <CardDescription className="mt-1">
          Criado {formatRelativeTime(template.created_at)}
        </CardDescription>
      </CardContent>
    </Card>
  )
}
