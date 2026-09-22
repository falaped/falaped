"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatTile } from "@/components/dashboard/admin/stat-tile"
import { formatBrazilianPhone, formatDate, formatRelativeTime } from "@/lib/formatters"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { cn } from "@/lib/utils"
import type { ProfileUsageRow } from "@/modules/admin/list-profile-usage"

/** Grupos do detalhe, na ordem em que o médico encontra as coisas no menu. */
const DETAIL_GROUPS: {
  title: string
  metrics: { key: keyof ProfileUsageRow; label: string }[]
}[] = [
  {
    title: "Atendimentos",
    metrics: [
      { key: "patients", label: "Pacientes" },
      { key: "cases", label: "Casos" },
      { key: "discussions", label: "Discussões" },
      { key: "appointments", label: "Consultas" },
    ],
  },
  {
    title: "Documentos emitidos",
    metrics: [
      { key: "prescriptions", label: "Receitas" },
      { key: "certificates", label: "Atestados" },
      { key: "referrals", label: "Encaminhamentos" },
      { key: "reports", label: "Relatórios" },
      { key: "case_reports", label: "Relatórios de caso" },
      { key: "exam_requests", label: "Pedidos de exame" },
      { key: "guidance", label: "Orientações" },
    ],
  },
  {
    title: "Ficha clínica",
    metrics: [
      { key: "vaccine_doses", label: "Doses vacinais" },
      { key: "measurements", label: "Medições" },
      { key: "scales", label: "Escalas" },
      { key: "attachments", label: "Anexos" },
    ],
  },
  {
    title: "Financeiro",
    metrics: [{ key: "financial_entries", label: "Lançamentos" }],
  },
]

/** Soma dos documentos — é o número que diz se a conta virou rotina ou não. */
export function documentsTotal(row: ProfileUsageRow): number {
  return (
    row.prescriptions +
    row.certificates +
    row.referrals +
    row.reports +
    row.case_reports +
    row.exam_requests +
    row.guidance
  )
}

function displayName(row: ProfileUsageRow): string {
  return [row.first_name, row.surname].filter(Boolean).join(" ").trim() || "Sem nome"
}

export function AdminUsersGrid({ rows }: { rows: ProfileUsageRow[] }) {
  const [selected, setSelected] = React.useState<ProfileUsageRow | null>(null)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const name = displayName(row)
          const documents = documentsTotal(row)
          const isDormant = row.last_case_at === null

          return (
            <Card
              key={row.profile_id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(row)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  setSelected(row)
                }
              }}
              // O Card do projeto marca a borda com `ring`, não com `border`: o realce de
              // hover/foco tem que ser em ring, senão não pinta nada.
              className={cn(
                "cursor-pointer gap-0 py-0 transition-all hover:bg-primary/5 hover:ring-2 hover:ring-primary",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                isDormant && "bg-muted/40",
              )}
            >
              <CardContent className="flex flex-col gap-4 p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      isDormant
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/15 text-primary",
                    )}
                    aria-hidden
                  >
                    {getPatientInitials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium leading-tight">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.email ?? "sem e-mail"}
                    </p>
                  </div>
                  <Badge variant={row.status === "paid" ? "default" : "secondary"}>
                    {row.status ?? "sem acesso"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <StatTile label="Pacientes" value={row.patients} />
                  <StatTile label="Casos" value={row.cases} />
                  <StatTile label="Documentos" value={documents} />
                </div>

                <p className="text-xs text-muted-foreground">
                  {isDormant
                    ? "Nunca abriu um caso"
                    : `Último caso ${formatRelativeTime(row.last_case_at)}`}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{displayName(selected)}</DialogTitle>
                <DialogDescription>
                  {selected.email ?? "sem e-mail"}
                  {selected.crm ? ` · CRM ${selected.crm}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Situação
                  </p>
                  <p className="mt-0.5">
                    {selected.status ?? "sem acesso"}
                    {selected.whatsapp_linked_at
                      ? ` · WhatsApp vinculado em ${formatDate(selected.whatsapp_linked_at)}`
                      : " · WhatsApp não vinculado"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Telefone
                  </p>
                  <p className="mt-0.5">
                    {selected.phone ? formatBrazilianPhone(selected.phone) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Conta criada em
                  </p>
                  <p className="mt-0.5">{formatDate(selected.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Último caso
                  </p>
                  <p className="mt-0.5">
                    {selected.last_case_at
                      ? `${formatDate(selected.last_case_at)} (${formatRelativeTime(selected.last_case_at)})`
                      : "nunca"}
                  </p>
                </div>
              </div>

              {DETAIL_GROUPS.map((group) => (
                <div key={group.title}>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {group.title}
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {group.metrics.map((metric) => (
                      <StatTile
                        key={metric.key}
                        label={metric.label}
                        value={selected[metric.key] as number}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
