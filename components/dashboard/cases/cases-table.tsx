"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  CalendarDays,
  Clock,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  PanelRightOpen,
  Unlock,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"
import { updateCaseStatusAction } from "@/actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatBrazilianPhone, formatDate, formatRelativeTime } from "@/lib/formatters"
import { getPatientInitials } from "@/lib/get-patient-initials"
import type { CaseWithPatient } from "@/modules/cases/get-cases-by-profile-id"
import { cn } from "@/lib/utils"

function getPrimaryLabel(c: CaseWithPatient): string {
  if (c.patient?.name) return c.patient.name
  if (c.patient?.responsible) return c.patient.responsible
  return "Sem paciente associado"
}

function caseHref(caseId: string): string {
  return `/dashboard/cases/${caseId}`
}

function StatusCaseBadge({ status }: { status: "active" | "closed" }) {
  if (status === "active") {
    return (
      <Badge variant="default" className="gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        </span>
        Ativo
      </Badge>
    )
  }
  return <Badge variant="secondary">Encerrado</Badge>
}

export function CasesTable({ cases }: { cases: CaseWithPatient[] }) {
  const router = useRouter()
  const [openingCaseId, setOpeningCaseId] = useState<string | null>(null)
  const [rowNavigatingId, setRowNavigatingId] = useState<string | null>(null)
  const [reopenDialogCaseId, setReopenDialogCaseId] = useState<string | null>(null)
  const [isReopenPending, startReopenTransition] = useTransition()

  const openCase = (caseId: string) => {
    setOpeningCaseId(caseId)
    router.push(caseHref(caseId))
    window.setTimeout(() => setOpeningCaseId(null), 400)
  }

  const onRowOpenCase = (caseId: string) => {
    setRowNavigatingId(caseId)
    router.push(caseHref(caseId))
    window.setTimeout(() => setRowNavigatingId(null), 450)
  }

  const handleConfirmReopen = () => {
    const caseId = reopenDialogCaseId
    if (!caseId) return
    startReopenTransition(async () => {
      const result = await updateCaseStatusAction(caseId, "active")
      if (result.ok) {
        setReopenDialogCaseId(null)
        router.refresh()
        router.push(caseHref(caseId))
        return
      }
      toast.error(result.error)
    })
  }

  const actionButtonsLocked = openingCaseId !== null || isReopenPending

  return (
    <Card className="overflow-hidden border-border/70 p-0">
      <AlertDialog
        open={reopenDialogCaseId !== null}
        onOpenChange={(open) => {
          if (!open && !isReopenPending) setReopenDialogCaseId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir este caso?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao reabrir este caso, o outro caso ativo (se houver) será encerrado. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReopenPending}>Cancelar</AlertDialogCancel>
            <Button disabled={isReopenPending} onClick={handleConfirmReopen}>
              {isReopenPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Reabrindo…
                </>
              ) : (
                "Reabrir"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TooltipProvider delayDuration={400}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[140px]">Paciente</TableHead>
                <TableHead className="min-w-[160px]">Responsável</TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">Início</TableHead>
                <TableHead className="min-w-[120px]">Canal</TableHead>
                <TableHead className="min-w-[120px]">Situação</TableHead>
                <TableHead className="w-48 min-w-48 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => {
                const primary = getPrimaryLabel(c)
                const isRowBusy = rowNavigatingId === c.id
                const isOpenButtonBusy = c.status === "active" && openingCaseId === c.id
                return (
                  <Tooltip key={c.id}>
                    <TooltipTrigger asChild>
                      <TableRow
                        tabIndex={0}
                        aria-busy={isRowBusy}
                        aria-label={
                          c.status === "active"
                            ? `Abrir caso de ${primary}`
                            : `Ver caso encerrado de ${primary}`
                        }
                        className={cn(
                          "group/row cursor-pointer select-none border-border/60 transition-[background-color,box-shadow] duration-150 outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-muted/70",
                          c.status === "active" && "bg-muted/25 hover:bg-muted/40",
                          c.status !== "active" && "hover:bg-muted/50",
                          isRowBusy && "bg-primary/15 ring-2 ring-primary/35 ring-inset",
                        )}
                        onClick={() => onRowOpenCase(c.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            onRowOpenCase(c.id)
                          }
                        }}
                      >
                        <TableCell className="py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar
                              size="sm"
                              className="ring-1 ring-border/80 transition-shadow group-hover/row:ring-border"
                              aria-hidden
                            >
                              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                                {getPatientInitials(primary)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold leading-tight tracking-tight">
                                {primary}
                              </p>
                              {c.patient?.contact_phone ? (
                                <p className="mt-0.5 truncate text-xs tabular-nums text-muted-foreground">
                                  {formatBrazilianPhone(c.patient.contact_phone)}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex min-w-0 items-start gap-2">
                            <UserRound
                              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                            <span className="min-w-0 text-sm leading-snug text-muted-foreground">
                              {c.patient?.responsible?.trim() ? (
                                c.patient.responsible
                              ) : (
                                <span className="italic text-muted-foreground/70">
                                  Não informado
                                </span>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <CalendarDays className="size-4 shrink-0 opacity-70" aria-hidden />
                              {formatDate(c.started_at)}
                            </div>
                            <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground/80">
                              <Clock className="size-3.5 shrink-0 opacity-70" aria-hidden />
                              {formatRelativeTime(c.started_at)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {c.origin === "dashboard" ? (
                            <Badge
                              variant="secondary"
                              className="gap-1.5 border-transparent bg-primary/12 pl-1.5 font-medium text-primary hover:bg-primary/18"
                            >
                              <LayoutDashboard className="size-3.5 shrink-0 opacity-90" aria-hidden />
                              Painel
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1.5 pl-1.5 font-medium">
                              <MessageCircle className="size-3.5 shrink-0" aria-hidden />
                              WhatsApp
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col items-start gap-1.5">
                            <StatusCaseBadge status={c.status} />
                            {(c.awaiting_patient_choice || c.awaiting_intent) && (
                              <div className="flex flex-wrap gap-1">
                                {c.awaiting_patient_choice ? (
                                  <Badge variant="outline" className="text-xs font-normal">
                                    Associar paciente
                                  </Badge>
                                ) : null}
                                {c.awaiting_intent ? (
                                  <Badge
                                    variant="outline"
                                    className="text-xs font-normal text-muted-foreground"
                                  >
                                    Aguardando resposta
                                  </Badge>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-48 min-w-48 py-4 text-right">
                          {c.status === "active" ? (
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="w-full min-w-0 cursor-pointer justify-center gap-1.5 transition-transform duration-150 active:scale-[0.98]"
                              disabled={actionButtonsLocked}
                              aria-busy={isOpenButtonBusy}
                              aria-label={`Abrir caso de ${primary}`}
                              onClick={(event) => {
                                event.stopPropagation()
                                openCase(c.id)
                              }}
                            >
                              {isOpenButtonBusy ? (
                                <>
                                  <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                                  Abrindo…
                                </>
                              ) : (
                                <>
                                  <PanelRightOpen className="size-3.5" aria-hidden />
                                  Abrir caso
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full min-w-0 cursor-pointer justify-center gap-1.5 transition-transform duration-150 active:scale-[0.98]"
                              disabled={actionButtonsLocked}
                              aria-label={`Reabrir caso de ${primary}`}
                              onClick={(event) => {
                                event.stopPropagation()
                                setReopenDialogCaseId(c.id)
                              }}
                            >
                              <Unlock className="size-3.5" aria-hidden />
                              Reabrir caso
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6} className="max-w-xs text-center">
                      {c.status === "active"
                        ? "Clique para abrir o caso."
                        : "Clique para ver o caso encerrado."}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </TooltipProvider>
    </Card>
  )
}
