"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatDate } from "@/lib/formatters"
import { deleteGuidanceDocumentAction } from "@/actions"
import type { GuidanceDocumentListItem } from "@/modules/guidance/types"

type GuidanceDocumentCardProps = {
  document: GuidanceDocumentListItem
}

/**
 * Card compacto de um documento de orientação gerado, com Baixar PDF e excluir.
 */
export function GuidanceDocumentCard({ document }: GuidanceDocumentCardProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleConfirmDelete() {
    setDeleting(true)
    const result = await deleteGuidanceDocumentAction(
      document.id,
      document.pdf_storage_path,
    )
    setDeleting(false)
    setDialogOpen(false)
    if (result.ok) {
      toast.success("Orientação excluída.")
      router.refresh()
    } else {
      toast.error(getFriendlyToastMessage(result.error))
    }
  }

  return (
    <>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex flex-col">
            <p className="font-medium text-foreground">
              {document.patient_name ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDate(document.issued_at)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {document.pdf_storage_path ? (
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link
                  href={`/api/guidance/${document.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Baixar PDF"
                >
                  <Download className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                PDF não disponível
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              disabled={deleting}
              onClick={() => setDialogOpen(true)}
              aria-label="Excluir orientação"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && deleting) return
          setDialogOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orientação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A orientação e o PDF associado
              serão removidos permanentemente.
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
