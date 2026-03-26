"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { CalendarDays, UserRound } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
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
import { formatBrazilianPhone, formatDate } from "@/lib/formatters"
import { getPatientInitials } from "@/lib/get-patient-initials"
import type { Patient } from "@/modules/patients/types"
import { cn } from "@/lib/utils"

function patientProfileHref(patientId: string): string {
  return `/dashboard/patients/${patientId}`
}

export function PatientsTable({ patients }: { patients: Patient[] }) {
  const router = useRouter()
  const [rowNavigatingId, setRowNavigatingId] = useState<string | null>(null)

  const onRowOpenProfile = (patientId: string) => {
    setRowNavigatingId(patientId)
    router.push(patientProfileHref(patientId))
    window.setTimeout(() => setRowNavigatingId(null), 450)
  }

  return (
    <Card className="overflow-hidden border-border/70 p-0">
      <TooltipProvider delayDuration={400}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[140px]">Paciente</TableHead>
                <TableHead className="min-w-[160px]">Responsável</TableHead>
                <TableHead className="min-w-[120px] whitespace-nowrap">Nascimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => {
                const isRowBusy = rowNavigatingId === patient.id
                return (
                  <Tooltip key={patient.id}>
                    <TooltipTrigger asChild>
                      <TableRow
                        tabIndex={0}
                        aria-busy={isRowBusy}
                        aria-label={`Abrir ficha de ${patient.name}`}
                        className={cn(
                          "group/row cursor-pointer select-none border-border/60 transition-[background-color,box-shadow] duration-150 outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-muted/70",
                          "hover:bg-muted/50",
                          isRowBusy && "bg-primary/15 ring-2 ring-primary/35 ring-inset",
                        )}
                        onClick={() => onRowOpenProfile(patient.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            onRowOpenProfile(patient.id)
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
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold leading-tight tracking-tight">
                                {patient.name}
                              </p>
                              {patient.contact_phone ? (
                                <a
                                  href={`tel:${patient.contact_phone}`}
                                  className="mt-0.5 block truncate text-xs tabular-nums text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {formatBrazilianPhone(patient.contact_phone)}
                                </a>
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
                      </TableRow>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6} className="max-w-xs text-center">
                      Clique para ver a ficha do paciente.
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
