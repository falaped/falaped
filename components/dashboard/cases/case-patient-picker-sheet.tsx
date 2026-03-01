"use client"

import * as React from "react"
import { useState, useTransition, useMemo } from "react"
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
import { setCasePatientIdAction } from "@/app/dashboard/cases/actions"
import { formatDate } from "@/lib/formatters"
import type { Patient } from "@/modules/patients/types"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Mode = "associate" | "replace"

type CasePatientPickerSheetProps = {
  caseId: string
  patients: Patient[]
  mode: Mode
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const confirmCopy: Record<Mode, string> = {
  associate: "Confirmar associação",
  replace: "Confirmar troca",
}

const titleCopy: Record<Mode, string> = {
  associate: "Associar paciente ao caso",
  replace: "Trocar paciente do caso",
}

function getGroupKey(p: Patient): string {
  const first = (p.name ?? "").trim().toUpperCase().slice(0, 1)
  return first && /[A-ZÀ-Ú]/.test(first) ? first : "#"
}

/** Groups patients by first letter of name (A–Z, # for other). */
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

export function CasePatientPickerSheet({
  caseId,
  patients,
  mode,
  open,
  onOpenChange,
  onSuccess,
}: CasePatientPickerSheetProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const groups = useMemo(() => groupPatientsByLetter(patients), [patients])
  const groupEntries = useMemo(
    () => Array.from(groups.entries()).sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b))),
    [groups],
  )

  function handleConfirm() {
    if (!selectedPatientId) {
      setError("Selecione um paciente.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await setCasePatientIdAction(caseId, selectedPatientId)
      if (result.ok) {
        onOpenChange(false)
        setSelectedPatientId("")
        onSuccess?.()
      } else {
        setError(result.error)
      }
    })
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError(null)
      setSelectedPatientId("")
    }
    onOpenChange(next)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={titleCopy[mode]}
    >
      <div className="flex flex-col">
        <Command
          className="rounded-none border-0"
          label={titleCopy[mode]}
        >
          <CommandInput placeholder="Buscar por nome ou responsável..." />
          <CommandList>
            <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
            {patients.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum paciente cadastrado. Cadastre um paciente em Pacientes.
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
                          onSelect={() => {
                            setSelectedPatientId(p.id)
                            setError(null)
                          }}
                          className={cn(
                            isChosen &&
                              "bg-accent text-accent-foreground ring-1 ring-ring ring-inset",
                          )}
                        >
                          <div className="flex w-full items-start gap-2">
                            <span
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-current",
                                isChosen
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-transparent",
                              )}
                              aria-hidden
                            >
                              {isChosen ? (
                                <CheckIcon className="h-3 w-3" />
                              ) : null}
                            </span>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="font-medium">{p.name}</span>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                {p.birth_date && (
                                  <span>Nasc.: {formatDate(p.birth_date)}</span>
                                )}
                                {p.responsible && (
                                  <span>
                                    Responsável: {p.responsible}
                                  </span>
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
          <>
            {error && (
              <p className="border-t px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {selectedPatientId && (
              <p className="border-t px-3 py-2 text-sm text-muted-foreground">
                Paciente selecionado:{" "}
                <span className="font-medium text-foreground">
                  {patients.find((p) => p.id === selectedPatientId)?.name ??
                    "—"}
                </span>
              </p>
            )}
            <div className="flex flex-row justify-end gap-2 border-t p-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isPending || !selectedPatientId}
              >
                {isPending ? "Salvando…" : confirmCopy[mode]}
              </Button>
            </div>
          </>
        )}
      </div>
    </CommandDialog>
  )
}
