"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RulerIcon } from "lucide-react"
import { toast } from "sonner"

import { createScaleResultAction } from "@/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import {
  SCALE_CATEGORY_LABELS,
  getScaleByKey,
  getScalesForAgeMonths,
  scoreScale,
  type ScaleCategory,
  type ScaleDefinition,
} from "@/lib/scales"
import { cn } from "@/lib/utils"

type ApplyScaleDialogProps = {
  patientId: string
  /** Consulta em que a escala está sendo aplicada; null na ficha do paciente. */
  caseId?: string | null
  /** Idade cronológica em meses inteiros; null filtra nada. */
  ageMonths: number | null
  className?: string
}

const CATEGORY_ORDER: readonly ScaleCategory[] = [
  "pronto_atendimento",
  "puericultura",
  "enfermaria_uti",
  "neonatologia",
]

/**
 * Respostas iniciais de uma escala: os itens com `defaultValue` já vêm marcados,
 * os demais ficam em branco e continuam obrigatórios.
 */
function buildInitialAnswers(scale: ScaleDefinition): Record<string, number> {
  const answers: Record<string, number> = {}
  for (const item of scale.items) {
    if (item.defaultValue !== undefined) answers[item.key] = item.defaultValue
  }
  return answers
}

/** Agrupa as escalas por categoria, preservando a ordem do seletor. */
function groupByCategory(
  scales: readonly ScaleDefinition[],
): { category: ScaleCategory; scales: ScaleDefinition[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    scales: scales.filter((scale) => scale.category === category),
  })).filter((group) => group.scales.length > 0)
}

export function ApplyScaleDialog({
  patientId,
  caseId = null,
  ageMonths,
  className,
}: ApplyScaleDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scaleKey, setScaleKey] = useState<string>("")
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)

  const available = useMemo(() => getScalesForAgeMonths(ageMonths), [ageMonths])
  const groups = useMemo(() => groupByCategory(available), [available])
  const scale = scaleKey ? getScaleByKey(scaleKey) : null

  // Prévia do resultado. Enquanto faltar item, `scoreScale` lança — é o
  // comportamento certo lá, e aqui vira só "ainda não dá para calcular".
  const preview = useMemo(() => {
    if (!scale) return null
    try {
      return scoreScale(scale, answers)
    } catch {
      return null
    }
  }, [scale, answers])

  function reset() {
    setScaleKey("")
    setAnswers({})
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  async function handleSave() {
    if (!scale || !preview) return
    setIsSaving(true)
    try {
      const result = await createScaleResultAction({
        patientId,
        caseId,
        scaleKey: scale.key,
        answers,
      })
      if (result.ok) {
        toast.success(
          `${scale.name}: ${result.score} — ${result.interpretation}`,
        )
        handleOpenChange(false)
        router.refresh()
      } else {
        toast.error(getFriendlyToastMessage(result.error))
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao registrar a escala. Tente novamente."
      toast.error(getFriendlyToastMessage(message))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={className}>
          <RulerIcon className="h-4 w-4" aria-hidden />
          Aplicar escala
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aplicar escala</DialogTitle>
          <DialogDescription>
            Escolha a escala, responda os itens e o resultado fica registrado no
            histórico do paciente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <Select
            value={scaleKey}
            onValueChange={(value) => {
              setScaleKey(value)
              const next = getScaleByKey(value)
              setAnswers(next ? buildInitialAnswers(next) : {})
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a escala" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectGroup key={group.category}>
                  <SelectLabel>
                    {SCALE_CATEGORY_LABELS[group.category]}
                  </SelectLabel>
                  {group.scales.map((item) => (
                    <SelectItem key={item.key} value={item.key}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

          {scale ? (
            <>
              <p className="text-sm text-muted-foreground">{scale.summary}</p>

              {scale.items.map((item) => (
                <fieldset key={item.key} className="flex flex-col gap-2">
                  <legend className="mb-1 text-sm font-medium">
                    {item.label}
                  </legend>
                  {item.options.map((option) => {
                    const id = `${scale.key}-${item.key}-${option.value}`
                    const checked = answers[item.key] === option.value
                    return (
                      <label
                        key={id}
                        htmlFor={id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm",
                          checked
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/40",
                        )}
                      >
                        <input
                          type="radio"
                          id={id}
                          name={`${scale.key}-${item.key}`}
                          className="mt-0.5"
                          checked={checked}
                          onChange={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              [item.key]: option.value,
                            }))
                          }
                        />
                        <span className="min-w-0 flex-1">{option.label}</span>
                      </label>
                    )
                  })}
                </fieldset>
              ))}

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                {preview ? (
                  <>
                    <p className="font-medium">
                      Escore {preview.score} — {preview.band.label}
                    </p>
                    {preview.band.conduct ? (
                      <p className="mt-1 text-muted-foreground">
                        {preview.band.conduct}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Responda todos os itens para ver o resultado.
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground/80">
                  {scale.source}
                </p>
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!preview || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
