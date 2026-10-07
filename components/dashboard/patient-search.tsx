"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { differenceInCalendarDays, differenceInMinutes, format } from "date-fns"
import { PlusIcon, SearchIcon, UserPlusIcon } from "lucide-react"
import { toast } from "sonner"

import { listPatientsForSearchAction, type PatientSearchItem } from "@/actions"
import { createDashboardCaseWithPatientAction } from "@/actions/cases/create-dashboard-case-with-patient"
import { precheckNewDashboardCaseAction } from "@/actions/cases/precheck-new-dashboard-case"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { PatientQuickRegister } from "@/components/dashboard/patient-quick-register"

type ActiveCase = { id: string; origin: "dashboard" | "whatsapp"; startedAt: string; patientId: string | null }

/** Quantas crianças aparecem em "Recentes" antes de digitar. */
const RECENT_COUNT = 6

const caseHref = (active: ActiveCase) =>
  active.origin === "dashboard" ? `/dashboard/cases/new/${active.id}` : `/dashboard/cases/${active.id}`

/** "da Helena", "do Miguel". */
const ofChild = (patient: Pick<PatientSearchItem, "name" | "sex">) =>
  `${patient.sex === "masculino" ? "do" : "da"} ${patient.name.split(" ")[0]}`
/** "a Helena", "o Miguel". */
const theChild = (patient: Pick<PatientSearchItem, "name" | "sex">) =>
  `${patient.sex === "masculino" ? "o" : "a"} ${patient.name.split(" ")[0]}`

function minutesSince(iso: string): string {
  const minutes = Math.max(0, differenceInMinutes(new Date(), new Date(iso)))
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`
}

function lastConsultLabel(iso: string | null): string {
  if (!iso) return "Ainda sem consulta"
  const days = differenceInCalendarDays(new Date(), new Date(iso))
  if (days === 0) return "Última consulta hoje"
  if (days === 1) return "Última consulta ontem"
  return `Última consulta em ${format(new Date(iso), "dd/MM/yyyy")}`
}

/**
 * "Iniciar consulta" e "Buscar paciente" do menu lateral (⌘K / Ctrl+K abre a busca).
 * As duas abrem a mesma janela com a consulta em andamento e as crianças atendidas por último,
 * mas cada uma com sua tarefa: em "Iniciar consulta" o ↵ abre a consulta; em "Buscar paciente"
 * o ↵ abre a ficha e a consulta fica num botão da linha. Se houver outra consulta aberta, o
 * médico escolhe antes de ela ser encerrada.
 */
export function PatientSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  /** "start": ↵ inicia a consulta; "search": ↵ abre a ficha. */
  const [mode, setMode] = useState<"start" | "search">("search")
  const [query, setQuery] = useState("")
  const [patients, setPatients] = useState<PatientSearchItem[] | null>(null)
  const [activeCase, setActiveCase] = useState<ActiveCase | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shortcut, setShortcut] = useState("Ctrl K")
  /** Criança à espera do "Encerrar a da X e atender". */
  const [pendingPatient, setPendingPatient] = useState<PatientSearchItem | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  /** Nome digitado ao abrir o cadastro rápido (a4); null = busca. */
  const [registering, setRegistering] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut("⌘K")
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setMode("search")
        setOpen((value) => !value)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Recarrega a cada abertura: a consulta aberta e os recentes mudam ao longo do dia.
  useEffect(() => {
    if (!open) return
    setQuery("")
    setRegistering(null)
    listPatientsForSearchAction().then((result) => {
      if (result.ok) {
        setPatients(result.patients)
        setActiveCase(result.activeCase)
        setError(null)
      } else setError(result.error)
    })
  }, [open])

  function go(href: string) {
    setOpen(false)
    setPendingPatient(null)
    router.push(href)
  }

  function create(patient: PatientSearchItem) {
    setBusyId(patient.id)
    startTransition(async () => {
      try {
        const created = await createDashboardCaseWithPatientAction(patient.id)
        if (!created.ok) {
          toast.error(getFriendlyToastMessage(created.error))
          return
        }
        go(`/dashboard/cases/new/${created.caseId}`)
      } finally {
        setBusyId(null)
      }
    })
  }

  function start(patient: PatientSearchItem) {
    if (isPending) return
    if (activeCase && activeCase.patientId === patient.id) return go(caseHref(activeCase))
    setBusyId(patient.id)
    startTransition(async () => {
      try {
        const precheck = await precheckNewDashboardCaseAction()
        if (!precheck.ok && precheck.code === "whatsapp_active" && precheck.activeCaseId) {
          const activeId = precheck.activeCaseId
          toast.error("Já existe um caso ativo em outro canal.", {
            action: { label: "Abrir caso", onClick: () => router.push(`/dashboard/cases/${activeId}`) },
          })
          return
        }
        if (!precheck.ok) {
          toast.error(getFriendlyToastMessage(precheck.error))
          return
        }
        if (precheck.willClosePriorActiveDashboardCases) {
          setPendingPatient(patient)
          return
        }
        create(patient)
      } finally {
        setBusyId(null)
      }
    })
  }

  const isStart = mode === "start"
  const activePatient = patients?.find((patient) => patient.id === activeCase?.patientId)
  const recents = (patients ?? [])
    .filter((patient) => patient.lastConsultAt)
    .sort((a, b) => b.lastConsultAt!.localeCompare(a.lastConsultAt!))
    .slice(0, RECENT_COUNT)
  // Sem digitar: Recentes (ou todos, se ninguém foi atendido ainda). Digitando: todos, filtrados.
  const listed = query.trim() || recents.length === 0 ? (patients ?? []) : recents

  return (
    <>
      <Button
        size="lg"
        onClick={() => {
          setMode("start")
          setOpen(true)
        }}
        title="Iniciar consulta"
        className="w-full group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0"
      >
        <PlusIcon />
        <span className="group-data-[collapsible=icon]:sr-only">Iniciar consulta</span>
      </Button>
      <div className="mt-3 w-full group-data-[collapsible=icon]:mt-1 group-data-[collapsible=icon]:w-auto">
        <button
          type="button"
          onClick={() => {
            setMode("search")
            setOpen(true)
          }}
          title="Buscar paciente"
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-left text-subtle-foreground shadow-xs transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:hover:bg-accent"
        >
          <SearchIcon className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 group-data-[collapsible=icon]:sr-only">Buscar paciente</span>
          <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[11px] font-medium text-subtle-foreground group-data-[collapsible=icon]:hidden">
            {shortcut}
          </kbd>
        </button>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen} title={isStart ? "Iniciar consulta" : "Buscar paciente"} className="top-[12vh] max-w-[600px] translate-y-0 rounded-2xl">
        {registering !== null ? (
          <PatientQuickRegister
            initialName={registering}
            busy={isPending}
            onBack={() => setRegistering(null)}
            onCreated={start}
          />
        ) : (
        <Command>
          <CommandInput value={query} onValueChange={setQuery} placeholder={isStart ? "Quem você vai atender? Nome, responsável ou telefone" : "Nome, responsável ou telefone"} />
          <CommandList className="max-h-[400px]">
            {patients ? (
              <>
                <CommandEmpty className="flex flex-col items-center gap-3 py-6 text-center">
                  <span className="text-muted-foreground">Nenhum paciente com &ldquo;{query.trim()}&rdquo;.</span>
                  <Button size="sm" onClick={() => setRegistering(query.trim())}>
                    <UserPlusIcon aria-hidden />
                    Cadastrar {query.trim().split(" ")[0]} e iniciar consulta
                  </Button>
                </CommandEmpty>
                <CommandGroup heading={listed === recents ? "Recentes" : "Pacientes"}>
                  {listed.map((patient) => {
                    const age = formatPediatricAgeShort(computePediatricAge(patient.birthDate))
                    const isActive = patient.id === activePatient?.id
                    return (
                      <CommandItem
                        key={patient.id}
                        value={`${patient.name} ${patient.responsible ?? ""} ${patient.contactPhone?.replace(/\D/g, "") ?? ""} ${patient.id}`}
                        onSelect={() => (isStart ? start(patient) : go(`/dashboard/patients/${patient.id}`))}
                        disabled={isPending && busyId !== patient.id}
                        className="group gap-3 rounded-lg px-3 py-2.5"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-caption font-semibold text-muted-foreground">
                          {getPatientInitials(patient.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">
                            <span className="font-semibold text-foreground">{patient.name}</span>
                            <span className="text-subtle-foreground">
                              {[age, patient.responsible].filter(Boolean).map((part) => ` · ${part}`).join("")}
                            </span>
                          </span>
                          {isActive && activeCase ? (
                            <span className="flex items-center gap-1 text-caption text-success-text">
                              <span className="size-1.5 rounded-full bg-success" aria-hidden />
                              Consulta em andamento há {minutesSince(activeCase.startedAt)}
                            </span>
                          ) : (
                            <span className="block text-caption text-muted-foreground">{lastConsultLabel(patient.lastConsultAt)}</span>
                          )}
                        </span>
                        {busyId === patient.id ? (
                          <span className="text-caption text-subtle-foreground">Abrindo…</span>
                        ) : isStart ? (
                          isActive ? (
                            <span className="rounded-md border border-border-strong bg-card px-2 py-1 text-caption font-medium text-foreground">
                              Voltar à consulta
                            </span>
                          ) : (
                            <kbd className="hidden rounded border border-border bg-card px-1.5 py-0.5 font-sans text-caption text-subtle-foreground group-data-[selected=true]:inline">
                              ↵ Iniciar
                            </kbd>
                          )
                        ) : (
                          <>
                            <kbd className="hidden rounded border border-border bg-card px-1.5 py-0.5 font-sans text-caption text-subtle-foreground group-data-[selected=true]:inline">
                              ↵ Abrir ficha
                            </kbd>
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={isPending}
                              className={isActive ? undefined : "invisible group-hover:visible group-data-[selected=true]:visible"}
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation()
                                start(patient)
                              }}
                            >
                              {isActive ? "Voltar à consulta" : "Iniciar consulta"}
                            </Button>
                          </>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            ) : (
              <p className="px-4 py-6 text-center text-muted-foreground" role={error ? "alert" : "status"}>
                {error ?? "Carregando pacientes…"}
              </p>
            )}
          </CommandList>
          <div className="border-t border-border p-3">
            <Button variant="outline" className="w-full" onClick={() => setRegistering(query.trim())}>
              <UserPlusIcon aria-hidden />
              Cadastrar paciente
            </Button>
          </div>
          <div className="flex gap-4 border-t border-border bg-muted px-5 py-2 text-caption text-subtle-foreground">
            <span>↑↓ navegar</span>
            <span>{isStart ? "↵ iniciar consulta" : "↵ abrir ficha"}</span>
            <span>Esc fechar</span>
          </div>
        </Command>
        )}
      </CommandDialog>

      <AlertDialog open={!!pendingPatient} onOpenChange={(value) => !value && setPendingPatient(null)}>
        <AlertDialogContent className="gap-5 p-6 data-[size=default]:sm:max-w-[560px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-title">A consulta {activePatient ? ofChild(activePatient) : "anterior"} ainda está aberta</AlertDialogTitle>
            <AlertDialogDescription>
              {activeCase ? `Começou há ${minutesSince(activeCase.startedAt)}. ` : ""}
              Para atender {pendingPatient ? theChild(pendingPatient) : "outra criança"}, ela será encerrada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="-mx-6 -mb-6 px-6">
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            {activeCase ? (
              <Button variant="outline" disabled={isPending} onClick={() => go(caseHref(activeCase))}>
                Voltar à consulta
              </Button>
            ) : null}
            <Button disabled={isPending} onClick={() => pendingPatient && create(pendingPatient)}>
              {isPending ? "Abrindo…" : `Encerrar e atender ${pendingPatient ? theChild(pendingPatient) : ""}`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
