"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/formatters"
import type { Patient } from "@/modules/patients/types"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type MedicalCertificatePatientPickerSheetProps = {
  patients: Patient[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (patient: Patient) => void
}

function getGroupKey(p: Patient): string {
  const first = (p.name ?? "").trim().toUpperCase().slice(0, 1)
  return first && /[A-ZÀ-Ú]/.test(first) ? first : "#"
}

function groupPatientsByLetter(patients: Patient[]): Map<string, Patient[]> {
  const map = new Map<string, Patient[]>()
  const sorted = [...patients].sort((a, b) =>
    (a.name ?? "").localeCompare(b.name ?? "", "pt-BR"),
  )
  for (const p of sorted) {
    const key = getGroupKey(p)
    const list = map.get(key) ?? []
    list.push(p)
    map.set(key, list)
  }
  return map
}

export function MedicalCertificatePatientPickerSheet({
  patients,
  open,
  onOpenChange,
  onSelect,
}: MedicalCertificatePatientPickerSheetProps) {
  const [selectedPatientId, setSelectedPatientId] = useState("")

  const groups = useMemo(() => groupPatientsByLetter(patients), [patients])
  const groupEntries = useMemo(
    () =>
      Array.from(groups.entries()).sort(([a], [b]) =>
        a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b),
      ),
    [groups],
  )

  function handleConfirm() {
    if (!selectedPatientId) return
    const patient = patients.find((p) => p.id === selectedPatientId)
    if (patient) {
      onSelect(patient)
      onOpenChange(false)
      setSelectedPatientId("")
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) setSelectedPatientId("")
    onOpenChange(next)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Associar paciente ao atestado"
    >
      <div className="flex flex-col">
        <Command className="rounded-none border-0" label="Associar paciente ao atestado">
          <CommandInput placeholder="Buscar por nome ou responsável..." />
          <CommandList>
            <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
            {patients.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum paciente cadastrado. Preencha os dados manualmente.
              </div>
            ) : (
              groupEntries.map(([letter, groupPatients], groupIndex) => (
                <React.Fragment key={letter}>
                  {groupIndex > 0 && <CommandSeparator />}
                  <CommandGroup heading={letter === "#" ? "Outros" : letter}>
                    {groupPatients.map((p) => {
                      const isChosen = selectedPatientId === p.id
                      return (
                        <CommandItem
                          key={p.id}
                          value={p.id}
                          keywords={[p.name ?? "", p.responsible ?? ""]}
                          onSelect={() => setSelectedPatientId(p.id)}
                          className={cn(
                            isChosen &&
                              "bg-accent text-accent-foreground ring-1 ring-ring ring-inset",
                          )}
                        >
                          <div className="flex w-full items-start gap-2">
                            <span
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-current",
                                isChosen ? "bg-primary text-primary-foreground" : "bg-transparent",
                              )}
                              aria-hidden
                            >
                              {isChosen ? <CheckIcon className="h-3 w-3" /> : null}
                            </span>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="font-medium">{p.name}</span>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                {p.birth_date && (
                                  <span>Nasc.: {formatDate(p.birth_date)}</span>
                                )}
                                {p.responsible && (
                                  <span>Responsável: {p.responsible}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </React.Fragment>
              ))
            )}
          </CommandList>
        </Command>
        {patients.length > 0 && (
          <div className="flex flex-row justify-end gap-2 border-t p-3">
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={!selectedPatientId}>
              Usar este paciente
            </Button>
          </div>
        )}
      </div>
    </CommandDialog>
  )
}
