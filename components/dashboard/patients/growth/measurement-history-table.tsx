"use client"

import { Fragment, useState } from "react"
import { MoreVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { computePediatricBmi } from "@/lib/parse-anthropometrics-for-bmi"
import type { Measurement } from "@/modules/patient-growth/types"
import { classifyBloodPressure } from "@/lib/bp-classification"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { normalizePatientSexFromDb } from "@/modules/patients/patient-sex"

import { MeasurementForm } from "./measurement-form"
import { RemoveMeasurementDialog } from "./remove-measurement-dialog"

const EMPTY = "—"

/** yyyy-mm-dd (date-only) → dd/mm/aaaa without timezone drift (parse parts, not `new Date(iso)`). */
function formatMeasuredOn(iso: string): string {
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

/** grams → kg with comma decimals; null → em dash. */
function formatWeight(grams: number | null): string {
  if (grams === null) return EMPTY
  return `${(grams / 1000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",")} kg`
}

/** mm → cm with comma decimals; null → em dash. */
function formatLengthMm(mm: number | null): string {
  if (mm === null) return EMPTY
  return `${(mm / 10).toFixed(1).replace(".", ",")} cm`
}

/** Derived IMC from a measurement's weight+height (both required — D-11). */
function formatBmi(weightGrams: number | null, lengthMm: number | null): string {
  if (weightGrams === null || lengthMm === null) return EMPTY
  const bmi = computePediatricBmi(weightGrams / 1000, lengthMm / 1000)
  if (!bmi.ok) return EMPTY
  return bmi.bmi.toFixed(1).replace(".", ",")
}

export function MeasurementHistoryTable({
  patientId,
  patientSex = null,
  patientBirthDate = null,
  measurements,
}: {
  patientId: string
  patientSex?: string | null
  patientBirthDate?: string | null
  measurements: Measurement[]
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Measurement | null>(null)

  // Classifica a PA de uma linha usando a idade NA DATA DAQUELA medição e a
  // estatura daquela mesma medição. Sem sexo, sem nascimento ou sem as duas
  // pressões, devolve null e a coluna mostra só os números.
  const classifyMeasurementBp = (m: Measurement) => {
    const sex = normalizePatientSexFromDb(patientSex)
    if (
      sex === null ||
      patientBirthDate === null ||
      m.systolic_bp === null ||
      m.diastolic_bp === null
    )
      return null
    const [y, mo, d] = m.measured_on.split("-").map(Number)
    const age = computePediatricAge(patientBirthDate, new Date(y, mo - 1, d))
    if (age.status !== "ok" || age.totalMonths === undefined) return null
    return classifyBloodPressure({
      ageYears: Math.floor(age.totalMonths / 12),
      sex,
      heightCm: m.length_height_mm === null ? null : m.length_height_mm / 10,
      systolic: m.systolic_bp,
      diastolic: m.diastolic_bp,
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Data
            </TableHead>
            <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Peso
            </TableHead>
            <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estatura
            </TableHead>
            <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              PC
            </TableHead>
            <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              IMC
            </TableHead>
            <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              PA
            </TableHead>
            <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {measurements.map((m) => (
            <Fragment key={m.id}>
              <TableRow className="even:bg-muted/50">
                <TableCell className="px-4 py-3 tabular-nums">
                  {formatMeasuredOn(m.measured_on)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right tabular-nums">
                  {formatWeight(m.weight_grams)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right tabular-nums">
                  {formatLengthMm(m.length_height_mm)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right tabular-nums">
                  {formatLengthMm(m.head_circumference_mm)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right tabular-nums">
                  {formatBmi(m.weight_grams, m.length_height_mm)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  {m.systolic_bp !== null && m.diastolic_bp !== null ? (
                    <span className="tabular-nums">
                      {m.systolic_bp}/{m.diastolic_bp}
                      {(() => {
                        const category = classifyMeasurementBp(m)
                        if (category === null || category.category === "normal")
                          return null
                        return (
                          <span className="ms-2 block text-xs font-normal text-muted-foreground">
                            {category.label}
                          </span>
                        )
                      })()}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Ações da medição de ${formatMeasuredOn(m.measured_on)}`}
                      >
                        <MoreVerticalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onSelect={() =>
                          setEditingId((current) =>
                            current === m.id ? null : m.id,
                          )
                        }
                      >
                        <PencilIcon className="h-4 w-4 opacity-80" aria-hidden />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setRemoving(m)}
                      >
                        <Trash2Icon className="h-4 w-4 opacity-80" aria-hidden />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              {editingId === m.id ? (
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={6} className="p-4">
                    <MeasurementForm
                      patientId={patientId}
                      patientSex={patientSex}
                      patientBirthDate={patientBirthDate}
                      mode="edit"
                      measurement={m}
                      open
                      onOpenChange={(next) => {
                        if (!next) setEditingId(null)
                      }}
                      onSaved={() => setEditingId(null)}
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          ))}
        </TableBody>
      </Table>

      {removing ? (
        <RemoveMeasurementDialog
          patientId={patientId}
          measurementId={removing.id}
          measuredOn={removing.measured_on}
          open={removing !== null}
          onOpenChange={(next) => {
            if (!next) setRemoving(null)
          }}
          onRemoved={() => setRemoving(null)}
        />
      ) : null}
    </div>
  )
}
