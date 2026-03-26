"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  PanelRightOpen,
  Stethoscope,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"
import { createDashboardCaseWithPatientAction } from "@/actions/cases/create-dashboard-case-with-patient"
import { precheckNewDashboardCaseAction } from "@/actions/cases/precheck-new-dashboard-case"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { sortPatientsForNewCase } from "@/lib/sort-patients-for-new-case"
import type { Patient } from "@/modules/patients/types"
import { formatBrazilianPhone, formatDate } from "@/lib/formatters"
import { CaseSearchInput } from "@/components/dashboard/cases/case-search-input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

function matchesSearch(patient: Patient, query: string): boolean {
  if (!query.trim()) return true
  const normalized = query.toLowerCase()
  return (
    patient.name.toLowerCase().includes(normalized) ||
    (patient.responsible ?? "").toLowerCase().includes(normalized)
  )
}

export function SelectPatientWorkspace({
  patients,
  initialPatientId,
  activeCaseByPatientId,
}: {
  patients: Patient[]
  initialPatientId: string | null
  activeCaseByPatientId: Record<string, { id: string; origin: "dashboard" | "whatsapp" }>
}) {
  const router = useRouter()
  const highlightedRowRef = useRef<HTMLTableRowElement>(null)
  const [query, setQuery] = useState("")
  const [pendingPatientId, setPendingPatientId] = useState<string | null>(null)
  const [willCloseCurrentCaseDialogOpen, setWillCloseCurrentCaseDialogOpen] =
    useState(false)
  const [profileNavigatingPatientId, setProfileNavigatingPatientId] = useState<
    string | null
  >(null)
  const [workspaceBusyPatientId, setWorkspaceBusyPatientId] = useState<string | null>(
    null,
  )
  const [isPending, startTransition] = useTransition()

  const activePatientIds = useMemo(
    () => new Set(Object.keys(activeCaseByPatientId)),
    [activeCaseByPatientId],
  )

  const filteredSortedPatients = useMemo(() => {
    const filtered = patients.filter((patient) => matchesSearch(patient, query))
    return sortPatientsForNewCase(filtered, activePatientIds)
  }, [patients, query, activePatientIds])

  useEffect(() => {
    if (!initialPatientId) return
    highlightedRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [initialPatientId, filteredSortedPatients])

  const handleCreateCase = (patientId: string) => {
    setWorkspaceBusyPatientId(patientId)
    startTransition(async () => {
      try {
        const precheck = await precheckNewDashboardCaseAction()

        if (!precheck.ok && precheck.code === "whatsapp_active" && precheck.activeCaseId) {
          toast.error("Existe um caso ativo do WhatsApp.", {
            action: {
              label: "Abrir caso",
              onClick: () => router.push(`/dashboard/cases/${precheck.activeCaseId}`),
            },
          })
          return
        }

        if (!precheck.ok) {
          toast.error(getFriendlyToastMessage(precheck.error))
          return
        }

        if (precheck.willClosePriorActiveDashboardCases) {
          setPendingPatientId(patientId)
          setWillCloseCurrentCaseDialogOpen(true)
          return
        }

        const created = await createDashboardCaseWithPatientAction(patientId)
        if (!created.ok) {
          if (created.code === "whatsapp_active" && created.activeCaseId) {
            toast.error(getFriendlyToastMessage(created.error), {
              action: {
                label: "Abrir caso",
                onClick: () => router.push(`/dashboard/cases/${created.activeCaseId}`),
              },
            })
            return
          }
          toast.error(getFriendlyToastMessage(created.error))
          return
        }

        router.push(`/dashboard/cases/new/${created.caseId}`)
      } finally {
        setWorkspaceBusyPatientId(null)
      }
    })
  }

  const handleConfirmReplaceAndCreate = () => {
    if (!pendingPatientId) return

    const patientId = pendingPatientId
    setWorkspaceBusyPatientId(patientId)
    startTransition(async () => {
      try {
        const created = await createDashboardCaseWithPatientAction(patientId)
        if (!created.ok) {
          toast.error(getFriendlyToastMessage(created.error))
          return
        }
        setWillCloseCurrentCaseDialogOpen(false)
        setPendingPatientId(null)
        router.push(`/dashboard/cases/new/${created.caseId}`)
      } finally {
        setWorkspaceBusyPatientId(null)
      }
    })
  }

  const openActiveCase = (patientId: string) => {
    const activeCase = activeCaseByPatientId[patientId]
    if (!activeCase) return
    setWorkspaceBusyPatientId(patientId)
    window.setTimeout(() => {
      setWorkspaceBusyPatientId(null)
    }, 380)
    if (activeCase.origin === "dashboard") {
      router.push(`/dashboard/cases/new/${activeCase.id}`)
      return
    }
    router.push(`/dashboard/cases/${activeCase.id}`)
  }

  const goToPatientProfile = (patientId: string) => {
    setProfileNavigatingPatientId(patientId)
    router.push(`/dashboard/patients/${patientId}`)
    window.setTimeout(() => {
      setProfileNavigatingPatientId(null)
    }, 450)
  }

  return (
    <section
      aria-label="Área de seleção de paciente para casos no painel"
      className="flex flex-col"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <CaseSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nome do paciente ou responsável..."
          aria-label="Buscar paciente por nome ou responsável"
        />
      </div>

      {patients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium">Nenhum paciente encontrado.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre um novo paciente para iniciar um caso.
            </p>
          </CardContent>
        </Card>
      ) : filteredSortedPatients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="font-medium text-muted-foreground">Nenhum resultado encontrado.</p>
          <p className="mt-1 text-sm text-muted-foreground/80">
            Tente outro termo de busca ou limpe o filtro.
          </p>
        </div>
      ) : (
        <Card className="overflow-hidden border-border/70 p-0">
          <TooltipProvider delayDuration={400}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[140px]">Paciente</TableHead>
                    <TableHead className="min-w-[160px]">Responsável</TableHead>
                    <TableHead className="min-w-[120px] whitespace-nowrap">Nascimento</TableHead>
                    <TableHead className="min-w-[140px]">Situação</TableHead>
                    <TableHead className="w-48 min-w-48 text-right">Workspace</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSortedPatients.map((patient) => {
                    const activeCase = activeCaseByPatientId[patient.id]
                    const isHighlighted = initialPatientId === patient.id
                    const isProfileLoading = profileNavigatingPatientId === patient.id
                    const isWorkspaceLoading = workspaceBusyPatientId === patient.id
                    const workspaceButtonsLocked = isPending || workspaceBusyPatientId !== null
                    return (
                      <Tooltip key={patient.id}>
                        <TooltipTrigger asChild>
                          <TableRow
                            ref={isHighlighted ? highlightedRowRef : undefined}
                            tabIndex={0}
                            aria-busy={isProfileLoading}
                            aria-label={`Abrir ficha do paciente ${patient.name}`}
                            className={cn(
                              "group/row cursor-pointer select-none border-border/60 transition-[background-color,box-shadow] duration-150 outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-muted/70",
                              activeCase && "bg-muted/25 hover:bg-muted/40",
                              !activeCase && "hover:bg-muted/50",
                              isHighlighted &&
                                "border-l-2 border-l-primary bg-primary/5 hover:bg-primary/10",
                              isProfileLoading &&
                                "bg-primary/15 ring-2 ring-primary/35 ring-inset",
                              isWorkspaceLoading &&
                                !isProfileLoading &&
                                "bg-muted/55 ring-2 ring-ring/45 ring-inset",
                            )}
                            onClick={() => goToPatientProfile(patient.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault()
                                goToPatientProfile(patient.id)
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
                              {getPatientInitials(patient.name)}
                            </AvatarFallback>
                            {activeCase ? (
                              <AvatarBadge
                                className="border-0 bg-primary"
                                aria-hidden
                              />
                            ) : null}
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold leading-tight tracking-tight">
                              {patient.name}
                            </p>
                            {patient.contact_phone ? (
                              <p className="mt-0.5 truncate text-xs tabular-nums text-muted-foreground">
                                {formatBrazilianPhone(patient.contact_phone)}
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
                            {patient.responsible?.trim() ? (
                              patient.responsible
                            ) : (
                              <span className="italic text-muted-foreground/70">
                                Não informado
                              </span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
                          <CalendarDays className="size-4 shrink-0 opacity-70" aria-hidden />
                          {patient.birth_date ? (
                            formatDate(patient.birth_date)
                          ) : (
                            <span className="italic text-muted-foreground/70">Não informado</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {activeCase ? (
                          activeCase.origin === "dashboard" ? (
                            <Badge
                              variant="secondary"
                              className="gap-1.5 border-transparent bg-primary/12 pl-1.5 font-medium text-primary hover:bg-primary/18"
                            >
                              <LayoutDashboard className="size-3.5 shrink-0 opacity-90" aria-hidden />
                              Caso no painel
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1.5 pl-1.5 font-medium">
                              <MessageCircle className="size-3.5 shrink-0" aria-hidden />
                              Caso no WhatsApp
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="gap-1.5 border-dashed pl-1.5 font-normal text-muted-foreground">
                            <span
                              className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                              aria-hidden
                            />
                            Sem caso ativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="w-48 min-w-48 py-4 text-right">
                        <Button
                          type="button"
                          variant={activeCase ? "secondary" : "default"}
                          size="sm"
                          className="w-full min-w-0 cursor-pointer justify-center gap-1.5 transition-transform duration-150 active:scale-[0.98]"
                          disabled={workspaceButtonsLocked}
                          aria-busy={isWorkspaceLoading}
                          aria-label={
                            activeCase
                              ? `Ver workspace de ${patient.name}`
                              : `Abrir workspace de ${patient.name}`
                          }
                          onClick={(event) => {
                            event.stopPropagation()
                            if (activeCase) {
                              openActiveCase(patient.id)
                              return
                            }
                            handleCreateCase(patient.id)
                          }}
                        >
                          {isWorkspaceLoading ? (
                            <>
                              <Loader2
                                className="size-3.5 shrink-0 animate-spin"
                                aria-hidden
                              />
                              Abrindo…
                            </>
                          ) : activeCase ? (
                            <>
                              <PanelRightOpen className="size-3.5" aria-hidden />
                              Ver workspace
                            </>
                          ) : (
                            <>
                              <Stethoscope className="size-3.5" aria-hidden />
                              Abrir workspace
                            </>
                          )}
                        </Button>
                      </TableCell>
                          </TableRow>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6} className="max-w-xs text-center">
                          Clique para ver o perfil do paciente.
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        </Card>
      )}

      <AlertDialog
        open={willCloseCurrentCaseDialogOpen}
        onOpenChange={setWillCloseCurrentCaseDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir caso ativo do painel?</AlertDialogTitle>
            <AlertDialogDescription>
              Existe um caso ativo iniciado no painel. Ao continuar, esse caso será encerrado
              para abrir um novo atendimento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplaceAndCreate} disabled={isPending}>
              Confirmar e continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
