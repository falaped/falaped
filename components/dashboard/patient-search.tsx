"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SearchIcon, UserPlusIcon } from "lucide-react"

import { listPatientsForSearchAction, type PatientSearchItem } from "@/actions"
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
import { formatPediatricAgeAbbrev } from "@/lib/format-pediatric-age"
import { getPatientInitials } from "@/lib/get-patient-initials"

const START_CONSULTATION = "/dashboard/cases/select-patient"

/**
 * "Buscar paciente" do menu lateral, com ⌘K / Ctrl+K em qualquer tela do painel.
 * Escolher a criança já leva para iniciar a consulta dela.
 */
export function PatientSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [patients, setPatients] = useState<PatientSearchItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shortcut, setShortcut] = useState("Ctrl K")

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut("⌘K")
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Carrega na primeira abertura; depois reaproveita a lista até recarregar a página.
  useEffect(() => {
    if (!open || patients) return
    listPatientsForSearchAction().then((result) => {
      if (result.ok) setPatients(result.patients)
      else setError(result.error)
    })
  }, [open, patients])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Buscar paciente"
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-left text-subtle-foreground shadow-xs transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:hover:bg-accent"
      >
        <SearchIcon className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 group-data-[collapsible=icon]:sr-only">Buscar paciente</span>
        <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[11px] font-medium text-subtle-foreground group-data-[collapsible=icon]:hidden">
          {shortcut}
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Buscar paciente" className="top-[12vh] max-w-[600px] translate-y-0 rounded-2xl">
        <Command>
          <CommandInput placeholder="Nome, responsável ou telefone" />
          <CommandList className="max-h-[360px]">
            {patients ? (
              <>
                <CommandEmpty>Nenhuma criança com esse nome. Cadastre abaixo.</CommandEmpty>
                <CommandGroup heading="Pacientes">
                  {patients.map((patient) => {
                    const age = formatPediatricAgeAbbrev(computePediatricAge(patient.birthDate))
                    return (
                      <CommandItem
                        key={patient.id}
                        value={`${patient.name} ${patient.responsible ?? ""} ${patient.contactPhone?.replace(/\D/g, "") ?? ""} ${patient.id}`}
                        onSelect={() => go(`${START_CONSULTATION}?patientId=${patient.id}`)}
                        className="group gap-3 rounded-lg px-3 py-2.5"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-caption font-semibold text-muted-foreground">
                          {getPatientInitials(patient.name)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-semibold text-foreground">{patient.name}</span>
                          <span className="text-subtle-foreground">
                            {[age, patient.responsible].filter(Boolean).map((part) => ` · ${part}`).join("")}
                          </span>
                        </span>
                        <span className="hidden text-caption text-subtle-foreground group-data-[selected=true]:inline">
                          ↵ Iniciar consulta
                        </span>
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
            <button
              type="button"
              onClick={() => go("/dashboard/patients/new")}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-card font-medium text-foreground shadow-xs hover:bg-accent"
            >
              <UserPlusIcon className="size-4" aria-hidden />
              Cadastrar paciente
            </button>
          </div>
          <div className="flex gap-4 border-t border-border bg-muted px-5 py-2 text-caption text-subtle-foreground">
            <span>↑↓ navegar</span>
            <span>↵ iniciar consulta</span>
            <span>Esc fechar</span>
          </div>
        </Command>
      </CommandDialog>
    </>
  )
}
