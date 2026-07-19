"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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

type GuidanceDocumentTableProps = {
  documents: GuidanceDocumentListItem[]
}

export function GuidanceDocumentTable({
  documents,
}: GuidanceDocumentTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  /** Rows hidden after successful delete until RSC props catch up (avoids flash of stale data). */
  const [hiddenRowIds, setHiddenRowIds] = useState<Set<string>>(() => new Set())

  const documentToDelete = deleteId
    ? documents.find((d) => d.id === deleteId)
    : null

  const displayDocuments = useMemo(
    () => documents.filter((d) => !hiddenRowIds.has(d.id)),
    [documents, hiddenRowIds],
  )

  useEffect(() => {
    setHiddenRowIds((prev) => {
      if (prev.size === 0) return prev
      const next = new Set<string>()
      for (const id of prev) {
        if (documents.some((d) => d.id === id)) next.add(id)
      }
      return next.size === prev.size ? prev : next
    })
  }, [documents])

  async function handleConfirmDelete() {
    if (!documentToDelete) return
    const removedId = documentToDelete.id
    setDeleting(true)
    const result = await deleteGuidanceDocumentAction(
      documentToDelete.id,
      documentToDelete.pdf_storage_path,
    )
    if (result.ok) {
      setHiddenRowIds((prev) => new Set(prev).add(removedId))
      toast.success("Orientação excluída.")
    } else {
      toast.error(getFriendlyToastMessage(result.error))
    }
    setDeleting(false)
    setDeleteId(null)
    if (result.ok) {
      router.refresh()
    }
  }

  return (
    <>
      <TooltipProvider>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayDocuments.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  {formatDate(doc.issued_at)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {doc.patient_name ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {doc.pdf_storage_path ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <Link
                              href={`/api/guidance/${doc.id}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Baixar PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Baixar PDF</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        PDF não disponível
                      </span>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          disabled={deleting}
                          onClick={() => setDeleteId(doc.id)}
                          aria-label="Excluir orientação"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Excluir orientação</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TooltipProvider>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open && deleting) return
          if (!open) setDeleteId(null)
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
