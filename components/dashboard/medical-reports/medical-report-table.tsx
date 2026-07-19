"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  deleteMedicalReportAction,
  deleteMedicalReportsBulkAction,
} from "@/actions"
import { ListDeletingSkeletonOverlay } from "@/components/dashboard/list-deleting-skeleton-overlay"
import type { MedicalReportListItem } from "@/modules/medical-reports/types"

type MedicalReportTableProps = {
  medicalReports: MedicalReportListItem[]
}

export function MedicalReportTable({
  medicalReports,
}: MedicalReportTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  /** Rows hidden after successful delete until RSC props catch up (avoids flash of stale data). */
  const [hiddenRowIds, setHiddenRowIds] = useState<Set<string>>(() => new Set())

  const reportToDelete = deleteId
    ? medicalReports.find((r) => r.id === deleteId)
    : null

  const displayReports = useMemo(
    () => medicalReports.filter((r) => !hiddenRowIds.has(r.id)),
    [medicalReports, hiddenRowIds],
  )

  useEffect(() => {
    setHiddenRowIds((prev) => {
      if (prev.size === 0) return prev
      const next = new Set<string>()
      for (const id of prev) {
        if (medicalReports.some((r) => r.id === id)) next.add(id)
      }
      return next.size === prev.size ? prev : next
    })
  }, [medicalReports])

  const selectedCount = selected.size
  const allIds = useMemo(
    () => displayReports.map((r) => r.id),
    [displayReports],
  )
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const someSelected = selectedCount > 0 && !allSelected
  const tableBusy = deleting || bulkDeleting

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (allIds.length === 0) return new Set()
      const allIn = allIds.every((id) => prev.has(id))
      if (allIn) return new Set()
      return new Set(allIds)
    })
  }, [allIds])

  const selectedRows = useMemo(
    () => medicalReports.filter((r) => selected.has(r.id)),
    [medicalReports, selected],
  )

  async function handleConfirmDelete() {
    if (!reportToDelete) return
    const removedId = reportToDelete.id
    setDeleting(true)
    const result = await deleteMedicalReportAction(
      reportToDelete.id,
      reportToDelete.pdf_storage_path,
    )
    if (result.ok) {
      setHiddenRowIds((prev) => new Set(prev).add(removedId))
      setSelected((s) => {
        const next = new Set(s)
        next.delete(removedId)
        return next
      })
      toast.success("Relatório excluído.")
    } else {
      toast.error(getFriendlyToastMessage(result.error))
    }
    setDeleting(false)
    setDeleteId(null)
    if (result.ok) {
      router.refresh()
    }
  }

  async function handleConfirmBulkDelete() {
    if (selectedRows.length === 0) return
    const idsToRemove = selectedRows.map((r) => r.id)
    setBulkDeleting(true)
    const result = await deleteMedicalReportsBulkAction(
      selectedRows.map((r) => ({
        id: r.id,
        pdfStoragePath: r.pdf_storage_path,
      })),
    )
    if (result.ok) {
      setHiddenRowIds((prev) => {
        const next = new Set(prev)
        for (const id of idsToRemove) next.add(id)
        return next
      })
      setSelected(new Set())
      toast.success(
        result.deletedCount === 1
          ? "1 relatório excluído."
          : `${result.deletedCount} relatórios excluídos.`,
      )
    } else {
      toast.error(getFriendlyToastMessage(result.error))
    }
    setBulkDeleting(false)
    setBulkDialogOpen(false)
    if (result.ok) {
      router.refresh()
    }
  }

  return (
    <>
      <div className="relative min-h-[120px]">
        {tableBusy ? (
          <ListDeletingSkeletonOverlay
            variant="prescriptions"
            label="Excluindo relatórios, aguarde."
            rows={Math.min(Math.max(displayReports.length, 4), 8)}
          />
        ) : null}
        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {selectedCount === 1
                ? "1 relatório selecionado"
                : `${selectedCount} relatórios selecionados`}
            </p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={tableBusy}
              onClick={() => setBulkDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir selecionados
            </Button>
          </div>
        ) : null}

        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] pr-0">
                  <Checkbox
                    aria-label="Selecionar todos"
                    disabled={tableBusy}
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={() => toggleAll()}
                  />
                </TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayReports.map((report) => (
                <TableRow
                  key={report.id}
                  data-state={
                    selected.has(report.id) ? "selected" : undefined
                  }
                >
                  <TableCell className="pr-0">
                    <Checkbox
                      aria-label={`Selecionar relatório de ${formatDate(report.issued_at)}`}
                      disabled={tableBusy}
                      checked={selected.has(report.id)}
                      onCheckedChange={() => toggleOne(report.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatDate(report.issued_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {report.patient_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {report.pdf_storage_path ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {tableBusy ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled
                                aria-label="Baixar PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                asChild
                              >
                                <Link
                                  href={`/api/medical-reports/${report.id}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label="Baixar PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
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
                            disabled={tableBusy}
                            onClick={() => setDeleteId(report.id)}
                            aria-label="Excluir relatório"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir relatório</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TooltipProvider>
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
            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O relatório e o PDF associado
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

      <AlertDialog
        open={bulkDialogOpen}
        onOpenChange={(open) => {
          if (!open && bulkDeleting) return
          setBulkDialogOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedCount === 1
                ? "Excluir 1 relatório?"
                : `Excluir ${selectedCount} relatórios?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os relatórios selecionados e os
              PDFs associados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={bulkDeleting}
              onClick={handleConfirmBulkDelete}
            >
              {bulkDeleting ? "Excluindo…" : "Excluir selecionados"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
