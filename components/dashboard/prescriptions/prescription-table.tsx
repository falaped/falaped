"use client"

import { useState } from "react"
import Link from "next/link"
import { Download, Trash2 } from "lucide-react"
import { toast } from "sonner"
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
import { deletePrescriptionAction } from "@/actions"
import type { PrescriptionListItem } from "@/modules/prescriptions/types"

type PrescriptionTableProps = {
  prescriptions: PrescriptionListItem[]
}

export function PrescriptionTable({ prescriptions }: PrescriptionTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const prescriptionToDelete = deleteId
    ? prescriptions.find((p) => p.id === deleteId)
    : null

  async function handleConfirmDelete() {
    if (!prescriptionToDelete) return
    setDeleting(true)
    const result = await deletePrescriptionAction(
      prescriptionToDelete.id,
      prescriptionToDelete.pdf_storage_path,
    )
    setDeleting(false)
    setDeleteId(null)
    if (result.ok) {
      toast.success("Receita excluída.")
    } else {
      toast.error(result.error)
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
            {prescriptions.map((prescription) => {
              return (
                <TableRow key={prescription.id}>
                  <TableCell className="font-medium">
                    {formatDate(prescription.issued_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {prescription.patient_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {prescription.pdf_storage_path ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              asChild
                            >
                              <Link
                                href={`/api/prescriptions/${prescription.id}/download`}
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
                            onClick={() => setDeleteId(prescription.id)}
                            aria-label="Excluir receita"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir receita</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TooltipProvider>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A receita e o PDF associado serão
              removidos permanentemente.
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
