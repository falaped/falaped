"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, MoreHorizontal, Trash2 } from "lucide-react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { formatDate } from "@/lib/formatters"
import {
  deleteMedicalCertificateAction,
  deleteMedicalCertificatesBulkAction,
} from "@/actions"
import { toast } from "sonner"
import { ListDeletingSkeletonOverlay } from "@/components/dashboard/list-deleting-skeleton-overlay"
import type {
  MedicalCertificateListItem,
  MedicalCertificateType,
} from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"

const TYPE_LABELS: Record<MedicalCertificateType, string> = {
  comparecimento: "Comparecimento",
  aptidao_fisica: "Aptidão Física",
  medico: "Médico (afastamento)",
  acompanhante: "Acompanhante",
}

type MedicalCertificateTableProps = {
  certificates: MedicalCertificateListItem[]
}

export function MedicalCertificateTable({
  certificates,
}: MedicalCertificateTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  /** Rows hidden after successful delete until RSC props catch up (avoids flash of stale data). */
  const [hiddenRowIds, setHiddenRowIds] = useState<Set<string>>(() => new Set())

  const certificateToDelete = deleteId
    ? certificates.find((c) => c.id === deleteId)
    : null

  const displayCertificates = useMemo(
    () => certificates.filter((c) => !hiddenRowIds.has(c.id)),
    [certificates, hiddenRowIds],
  )

  useEffect(() => {
    setHiddenRowIds((prev) => {
      if (prev.size === 0) return prev
      const next = new Set<string>()
      for (const id of prev) {
        if (certificates.some((c) => c.id === id)) next.add(id)
      }
      return next.size === prev.size ? prev : next
    })
  }, [certificates])

  const selectedCount = selected.size
  const allIds = useMemo(
    () => displayCertificates.map((c) => c.id),
    [displayCertificates],
  )
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id))
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
    () => certificates.filter((c) => selected.has(c.id)),
    [certificates, selected],
  )

  async function handleConfirmDelete() {
    if (!certificateToDelete) return
    const removedId = certificateToDelete.id
    setDeleting(true)
    const result = await deleteMedicalCertificateAction(
      certificateToDelete.id,
      certificateToDelete.pdf_storage_path,
    )
    if (result.ok) {
      setHiddenRowIds((prev) => new Set(prev).add(removedId))
      setSelected((s) => {
        const next = new Set(s)
        next.delete(removedId)
        return next
      })
      toast.success("Atestado excluído.")
    } else {
      toast.error(result.error)
    }
    setDeleting(false)
    setDeleteId(null)
    if (result.ok) {
      router.refresh()
    }
  }

  async function handleConfirmBulkDelete() {
    if (selectedRows.length === 0) return
    const idsToRemove = selectedRows.map((c) => c.id)
    setBulkDeleting(true)
    const result = await deleteMedicalCertificatesBulkAction(
      selectedRows.map((c) => ({
        id: c.id,
        pdfStoragePath: c.pdf_storage_path,
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
          ? "1 atestado excluído."
          : `${result.deletedCount} atestados excluídos.`,
      )
    } else {
      toast.error(result.error)
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
            variant="medical-certificates"
            label="Excluindo atestados, aguarde."
            rows={Math.min(Math.max(displayCertificates.length, 4), 8)}
          />
        ) : null}
        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {selectedCount === 1
                ? "1 atestado selecionado"
                : `${selectedCount} atestados selecionados`}
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

        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px] pr-0">
              <Checkbox
                aria-label="Selecionar todos"
                disabled={tableBusy}
                checked={
                  allSelected ? true : someSelected ? "indeterminate" : false
                }
                onCheckedChange={() => toggleAll()}
              />
            </TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead className="w-[80px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayCertificates.map((cert) => {
            const subtitle = cert.patient_name ?? cert.location_state ?? "—"
            return (
              <TableRow key={cert.id} data-state={selected.has(cert.id) ? "selected" : undefined}>
                <TableCell className="pr-0">
                  <Checkbox
                    aria-label={`Selecionar atestado de ${formatDate(cert.issued_at)}`}
                    disabled={tableBusy}
                    checked={selected.has(cert.id)}
                    onCheckedChange={() => toggleOne(cert.id)}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium">
                  {formatDate(cert.issued_at)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {TYPE_LABELS[cert.type]}
                </TableCell>
                <TableCell className="min-w-0 max-w-[200px] truncate text-muted-foreground">
                  {subtitle}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={tableBusy}
                        aria-label="Abrir ações"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[12rem]">
                      {cert.pdf_storage_path ? (
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/api/medical-certificates/${cert.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Baixar PDF
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteId(cert.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir atestado
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        </Table>
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
            <AlertDialogTitle>Excluir atestado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O atestado e o PDF associado
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
                ? "Excluir 1 atestado?"
                : `Excluir ${selectedCount} atestados?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os atestados selecionados e os PDFs
              associados serão removidos permanentemente.
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
