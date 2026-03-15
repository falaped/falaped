"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription } from "@/components/ui/card"
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
import type { PrescriptionTemplateOption } from "@/modules/prescription-templates/get-prescription-templates-by-profile-id"
import { deletePrescriptionTemplateAction } from "@/actions"
import { formatRelativeTime } from "@/lib/formatters"
import { toast } from "sonner"
import { useState } from "react"

export function PrescriptionTemplateList({
  templates,
}: {
  templates: PrescriptionTemplateOption[]
}) {
  if (templates.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">Nenhum template de receita</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ao criar uma receita, use &quot;Salvar como template&quot; para
            guardar um modelo e reutilizá-lo depois.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
      {templates.map((template) => (
        <PrescriptionTemplateCard key={template.id} template={template} />
      ))}
    </div>
  )
}

function PrescriptionTemplateCard({
  template,
}: {
  template: PrescriptionTemplateOption
}) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deletePrescriptionTemplateAction(template.id)
    setIsDeleting(false)
    if (result.ok) {
      setDeleteOpen(false)
      toast.success("Template excluído.")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Card>
      <CardContent className="p-4 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-base font-semibold">
            {template.name}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="default" size="sm" asChild>
                  <Link href={`/dashboard/prescriptions/novo?templateId=${template.id}`}>
                    Usar
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                Criar nova receita com este template
              </TooltipContent>
            </Tooltip>
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
                    Este template será removido. Você poderá criar outro a
                    partir de uma receita quando quiser.
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
          </div>
        </div>
        <CardDescription className="mt-1">
          Criado {formatRelativeTime(template.created_at)}
        </CardDescription>
      </CardContent>
    </Card>
  )
}
