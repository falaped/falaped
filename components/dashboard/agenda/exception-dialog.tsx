"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarOff, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  createAvailabilityExceptionAction,
  deleteAvailabilityExceptionAction,
} from "@/actions/availability"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

/** Linha crua de exceção (snake_case, espelha o DB / Plano 01). */
type ExceptionRow = {
  id: string
  exception_date: string
  start_minute: number | null
  end_minute: number | null
}

/** "HH:mm" ⟷ minutos-desde-meia-noite, em passos de 30 (D-03/D-04). */
function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Opções de 00:00 a 23:30 em passos de 30 min. */
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => i * 30)

/** Formata "YYYY-MM-DD" (fuso da clínica) para exibição PT-BR sem reparse com TZ. */
function formatExceptionDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const localNoon = new Date(year, (month ?? 1) - 1, day ?? 1, 12)
  return format(localNoon, "dd/MM/yyyy", { locale: ptBR })
}

/** "YYYY-MM-DD" a partir de um Date, em componentes locais (sem shift de TZ). */
function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Dialog "Adicionar folga" (AGENDA-03, D-04): react-day-picker SÓ como
 * date-picker (nunca como grade), toggle Dia inteiro / Período (faixa parcial
 * múltiplos de 30). Lista as folgas cadastradas com AlertDialog de exclusão
 * confirmada. Folga = tratamento neutro (bg-muted, badge "Folga"), NÃO
 * destructive red — um dia off não é um erro (UI-SPEC §Color).
 */
export function ExceptionDialog({
  exceptions,
}: {
  exceptions: ExceptionRow[]
}) {
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    undefined,
  )
  const [fullDay, setFullDay] = React.useState(true)
  const [startMinute, setStartMinute] = React.useState(480) // 08:00
  const [endMinute, setEndMinute] = React.useState(720) // 12:00
  const [saving, setSaving] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  async function handleSubmit() {
    if (!selectedDate) {
      toast.error("Selecione uma data para a folga.")
      return
    }
    if (!fullDay && endMinute <= startMinute) {
      toast.error("O horário final deve ser maior que o inicial.")
      return
    }

    setSaving(true)
    const result = await createAvailabilityExceptionAction({
      exception_date: toIsoDate(selectedDate),
      start_minute: fullDay ? null : startMinute,
      end_minute: fullDay ? null : endMinute,
    })
    setSaving(false)

    if (result.ok) {
      toast.success("Folga adicionada.")
      setOpen(false)
      setSelectedDate(undefined)
      setFullDay(true)
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteAvailabilityExceptionAction({ id })
    setDeletingId(null)
    if (result.ok) {
      toast.success("Folga removida.")
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Folgas</h2>
          <p className="text-sm text-muted-foreground">
            Bloqueie um dia inteiro ou um período específico.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary">
              <CalendarOff className="h-4 w-4" />
              Adicionar folga
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar folga</DialogTitle>
              <DialogDescription>
                Escolha a data e defina se é o dia inteiro ou um período.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                className="rounded-lg border"
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={fullDay ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFullDay(true)}
                >
                  Dia inteiro
                </Button>
                <Button
                  type="button"
                  variant={!fullDay ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFullDay(false)}
                >
                  Período
                </Button>
              </div>

              {!fullDay ? (
                <div className="flex items-end gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm">Início</Label>
                    <Select
                      value={String(startMinute)}
                      onValueChange={(v) => setStartMinute(Number(v))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            {minutesToLabel(m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm">Fim</Label>
                    <Select
                      value={String(endMinute)}
                      onValueChange={(v) => setEndMinute(Number(v))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            {minutesToLabel(m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={saving || !selectedDate}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar folga"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {exceptions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Nenhuma folga cadastrada.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Adicione uma folga para bloquear um dia ou um período específico.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {exceptions.map((exception) => {
            const isPartial =
              exception.start_minute !== null && exception.end_minute !== null
            const rangeLabel = isPartial
              ? `${minutesToLabel(exception.start_minute as number)}–${minutesToLabel(
                  exception.end_minute as number,
                )}`
              : "Dia inteiro"
            return (
              <li
                key={exception.id}
                className={cn(
                  "flex items-center justify-between rounded-lg bg-muted px-4 py-3",
                )}
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="bg-muted text-muted-foreground"
                  >
                    Folga
                  </Badge>
                  <span className="text-base">
                    {formatExceptionDate(exception.exception_date)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {rangeLabel}
                  </span>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir folga"
                      disabled={deletingId === exception.id}
                    >
                      {deletingId === exception.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir folga?</AlertDialogTitle>
                      <AlertDialogDescription>
                        A folga de{" "}
                        {formatExceptionDate(exception.exception_date)} será
                        removida e o dia voltará à disponibilidade recorrente.
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => handleDelete(exception.id)}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
