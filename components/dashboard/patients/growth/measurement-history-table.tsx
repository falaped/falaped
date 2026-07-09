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
  measurements,
}: {
  patientId: string
  measurements: Measurement[]
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Measurement | null>(null)

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
