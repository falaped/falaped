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
import { Badge } from "@/components/ui/badge"
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
import { deleteReferralAction, deleteReferralsBulkAction } from "@/actions"
import { ListDeletingSkeletonOverlay } from "@/components/dashboard/list-deleting-skeleton-overlay"
import type { ReferralListItem, ReferralUrgency } from "@/modules/referrals/types"

type ReferralTableProps = {
  referrals: ReferralListItem[]
}

const URGENCY_META: Record<
  ReferralUrgency,
  { label: string; variant: "secondary" | "default" | "destructive" }
> = {
  rotina: { label: "Rotina", variant: "secondary" },
  prioritario: { label: "Prioritário", variant: "default" },
  urgente: { label: "Urgente", variant: "destructive" },
}

function getUrgency(referral: ReferralListItem): ReferralUrgency {
  const raw = referral.payload?.urgency
  if (raw === "prioritario" || raw === "urgente" || raw === "rotina") return raw
  return "rotina"
}

export function ReferralTable({ referrals }: ReferralTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  /** Rows hidden after successful delete until RSC props catch up (avoids flash of stale data). */
  const [hiddenRowIds, setHiddenRowIds] = useState<Set<string>>(() => new Set())

  const referralToDelete = deleteId
    ? referrals.find((r) => r.id === deleteId)
    : null

  const displayReferrals = useMemo(
    () => referrals.filter((r) => !hiddenRowIds.has(r.id)),
    [referrals, hiddenRowIds],
  )

  useEffect(() => {
    setHiddenRowIds((prev) => {
      if (prev.size === 0) return prev
      const next = new Set<string>()
      for (const id of prev) {
        if (referrals.some((r) => r.id === id)) next.add(id)
      }
      return next.size === prev.size ? prev : next
    })
  }, [referrals])

  const selectedCount = selected.size
  const allIds = useMemo(
    () => displayReferrals.map((r) => r.id),
    [displayReferrals],
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
    () => referrals.filter((r) => selected.has(r.id)),
    [referrals, selected],
  )

  async function handleConfirmDelete() {
    if (!referralToDelete) return
    const removedId = referralToDelete.id
    setDeleting(true)
    const result = await deleteReferralAction(
      referralToDelete.id,
      referralToDelete.pdf_storage_path,
    )
    if (result.ok) {
      setHiddenRowIds((prev) => new Set(prev).add(removedId))
      setSelected((s) => {
        const next = new Set(s)
        next.delete(removedId)
        return next
      })
      toast.success("Encaminhamento excluído.")
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
    const result = await deleteReferralsBulkAction(
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
          ? "1 encaminhamento excluído."
          : `${result.deletedCount} encaminhamentos excluídos.`,
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
            label="Excluindo encaminhamentos, aguarde."
            rows={Math.min(Math.max(displayReferrals.length, 4), 8)}
          />
        ) : null}
        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {selectedCount === 1
                ? "1 encaminhamento selecionado"
                : `${selectedCount} encaminhamentos selecionados`}
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
                <TableHead>Urgência</TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayReferrals.map((referral) => {
                const urgency = URGENCY_META[getUrgency(referral)]
                return (
                  <TableRow
                    key={referral.id}
                    data-state={
                      selected.has(referral.id) ? "selected" : undefined
                    }
                  >
                    <TableCell className="pr-0">
                      <Checkbox
                        aria-label={`Selecionar encaminhamento de ${formatDate(referral.issued_at)}`}
                        disabled={tableBusy}
                        checked={selected.has(referral.id)}
                        onCheckedChange={() => toggleOne(referral.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatDate(referral.issued_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {referral.patient_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={urgency.variant}>{urgency.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {referral.pdf_storage_path ? (
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
                                    href={`/api/referrals/${referral.id}/download`}
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
                              onClick={() => setDeleteId(referral.id)}
                              aria-label="Excluir encaminhamento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir encaminhamento</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
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
            <AlertDialogTitle>Excluir encaminhamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O encaminhamento e o PDF associado
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
                ? "Excluir 1 encaminhamento?"
                : `Excluir ${selectedCount} encaminhamentos?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os encaminhamentos selecionados e os
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
