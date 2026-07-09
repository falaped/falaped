"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteMeasurementAction } from "@/actions"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/** yyyy-mm-dd (date-only) → dd/mm/aaaa without timezone drift (parse parts). */
function formatMeasuredOn(iso: string): string {
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

type RemoveMeasurementDialogProps = {
  patientId: string
  measurementId: string
  /** measured_on in yyyy-mm-dd, rendered as dd/mm/aaaa in the body copy. */
  measuredOn: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRemoved?: () => void
}

export function RemoveMeasurementDialog({
  patientId,
  measurementId,
  measuredOn,
  open,
  onOpenChange,
  onRemoved,
}: RemoveMeasurementDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Remover medição?</AlertDialogTitle>
          <AlertDialogDescription>
            A medição de {formatMeasuredOn(measuredOn)} será removida do histórico
            e da curva. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={async () => {
              setLoading(true)
              try {
                const result = await deleteMeasurementAction({
                  id: measurementId,
                  patientId,
                })
                if (result.ok) {
                  onOpenChange(false)
                  router.refresh()
                  onRemoved?.()
                } else {
                  toast.error(
                    getFriendlyToastMessage(
                      "Não foi possível remover a medição.",
                    ),
                  )
                }
              } finally {
                setLoading(false)
              }
            }}
          >
            {loading ? "Removendo..." : "Remover"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
