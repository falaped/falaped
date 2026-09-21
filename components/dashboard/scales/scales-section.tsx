"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RulerIcon, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { deleteScaleResultAction } from "@/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ApplyScaleDialog } from "@/components/dashboard/scales/apply-scale-dialog"
import { formatDateTime } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { getScaleByKey } from "@/lib/scales"
import type { ScaleResult } from "@/modules/patient-scales/types"

type ScalesSectionProps = {
  patientId: string
  /** Consulta atual; null na ficha do paciente (histórico completo). */
  caseId?: string | null
  /** Idade cronológica em meses inteiros, para filtrar as escalas aplicáveis. */
  ageMonths: number | null
  results: ScaleResult[]
  title?: string
  description?: string
}

export function ScalesSection({
  patientId,
  caseId = null,
  ageMonths,
  results,
  title = "Escalas aplicadas",
  description = "Escalas respondidas durante os atendimentos, com escore e interpretação.",
}: ScalesSectionProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const result = await deleteScaleResultAction({ id, patientId, caseId })
      if (result.ok) {
        toast.success("Escala apagada.")
        router.refresh()
      } else {
        toast.error(getFriendlyToastMessage(result.error))
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao apagar a escala. Tente novamente."
      toast.error(getFriendlyToastMessage(message))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <ApplyScaleDialog
          patientId={patientId}
          caseId={caseId}
          ageMonths={ageMonths}
        />
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <RulerIcon className="h-6 w-6 text-muted-foreground" aria-hidden />
            </div>
            <p className="mt-4 font-medium text-muted-foreground">
              Nenhuma escala aplicada
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground/80">
              Use &quot;Aplicar escala&quot; para responder uma escala e guardar o
              resultado no histórico.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {results.map((result) => {
              const scale = getScaleByKey(result.scale_key)
              return (
                <li
                  key={result.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {scale?.name ?? result.scale_key}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {result.score !== null ? (
                        <Badge variant="secondary" className="font-normal">
                          Escore {result.score}
                        </Badge>
                      ) : null}
                      <Badge variant="outline" className="font-normal">
                        {result.interpretation}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(result.applied_at)}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(result.id)}
                    disabled={deletingId === result.id}
                    aria-label={`Apagar ${scale?.name ?? result.scale_key}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
