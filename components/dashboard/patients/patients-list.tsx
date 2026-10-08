"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { differenceInCalendarDays, differenceInMonths, format } from "date-fns"
import { FileWarningIcon, InfoIcon, RulerIcon, SearchIcon, TriangleAlertIcon, XIcon } from "lucide-react"

import { AttentionSymbol } from "@/components/dashboard/attention-symbol"
import { openStartConsult } from "@/components/dashboard/patient-search"
import { SectionTab } from "@/components/dashboard/section-tab"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList } from "@/components/ui/tabs"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { formatBrazilianPhone } from "@/lib/formatters"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { matchPatientQuery } from "@/lib/match-patient-query"
import { getPatientAttention, type PatientAttention } from "@/lib/patient-attention"
import type { PatientOverview, PatientsOverview } from "@/modules/patients/get-patients-overview"

type Tab = "recent" | "az" | "attention"
export type PatientListRow = PatientOverview & { photoUrl: string | null }

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Lista de Pacientes (protótipo b4): abas Atendidos recentemente, A–Z e Precisam de atenção,
 * busca por nome, responsável ou telefone, e "Atender" direto da linha.
 */
export function PatientsList({
  rows,
  activeCase,
  nowIso,
}: {
  rows: PatientListRow[]
  activeCase: PatientsOverview["activeCase"]
  nowIso: string
}) {
  const [tab, setTab] = useState<Tab>("recent")
  const [query, setQuery] = useState("")
  const now = useMemo(() => new Date(nowIso), [nowIso])

  const withAttention = useMemo(() => rows.map((row) => ({ row, attention: getPatientAttention(row, now) })), [rows, now])
  const attentionCount = withAttention.filter(({ attention }) => attention.incomplete || attention.measure).length

  const listed = useMemo(() => {
    const filtered = withAttention.filter(({ row, attention }) => {
      if (tab === "attention" && !attention.incomplete && !attention.measure) return false
      return (
        !query.trim() ||
        matchPatientQuery(
          { name: row.patient.name, responsible: row.patient.responsible, contactPhone: row.patient.contact_phone },
          query,
        )
      )
    })
    if (tab === "az") return filtered.sort((a, b) => a.row.patient.name.localeCompare(b.row.patient.name, "pt-BR"))
    // Atendidos por último primeiro; quem nunca foi atendido vai para o fim, do cadastro mais novo.
    return filtered.sort(
      (a, b) =>
        (b.row.lastConsultAt ?? "").localeCompare(a.row.lastConsultAt ?? "") ||
        b.row.patient.created_at.localeCompare(a.row.patient.created_at),
    )
  }, [withAttention, tab, query])

  return (
    <section className="rounded-xl border border-border bg-card">
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="gap-0">
        <div className="flex items-end gap-6 px-5 pt-4">
          <TabsList className="h-auto w-auto gap-5 rounded-none bg-transparent p-0 lg:w-auto">
            <SectionTab value="recent">Atendidos recentemente</SectionTab>
            <SectionTab value="az">A–Z</SectionTab>
            <SectionTab value="attention">
              Precisam de atenção
              {attentionCount ? (
                <span
                  aria-label={plural(attentionCount, "criança", "crianças")}
                  className="num inline-flex items-center gap-1 rounded-full bg-warning-soft px-1.5 text-caption font-semibold text-warning-text"
                >
                  <InfoIcon className="size-3" aria-hidden />
                  {attentionCount}
                </span>
              ) : null}
            </SectionTab>
          </TabsList>
          <div className="relative mb-2.5 ml-auto w-80">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome, responsável ou telefone"
              aria-label="Buscar paciente por nome, responsável ou telefone"
              className="pr-8 pl-8"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-subtle-foreground hover:text-foreground"
              >
                <XIcon className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </Tabs>

      <div className="grid grid-cols-[1.6fr_1.4fr_1.3fr_120px_150px] gap-4 border-y border-border bg-muted px-5 py-2.5 text-label font-medium text-muted-foreground">
        <span>Paciente</span>
        <span>Responsável</span>
        <span>Última consulta</span>
        <span>Atenção</span>
        <span />
      </div>
      {listed.length === 0 ? (
        <p className="px-5 py-6 text-muted-foreground">
          {query.trim()
            ? `Nenhum paciente com "${query.trim()}".`
            : tab === "attention"
              ? "Ninguém precisa de atenção: fichas completas e medidas em dia."
              : "Os pacientes que você cadastrar aparecem aqui."}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {listed.map(({ row, attention }) => (
            <Row key={row.patient.id} row={row} attention={attention} now={now} activeCase={activeCase} />
          ))}
        </div>
      )}
    </section>
  )
}

function Row({
  row,
  attention,
  now,
  activeCase,
}: {
  row: PatientListRow
  attention: PatientAttention
  now: Date
  activeCase: PatientsOverview["activeCase"]
}) {
  const { patient } = row
  const age = patient.birth_date ? formatPediatricAgeShort(computePediatricAge(patient.birth_date)) : null
  const inConsult = activeCase?.patientId === patient.id

  return (
    <div className="relative grid min-h-14 grid-cols-[1.6fr_1.4fr_1.3fr_120px_150px] items-center gap-4 px-5 py-2.5 hover:bg-accent">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-9">
          {row.photoUrl ? <AvatarImage src={row.photoUrl} alt="" /> : null}
          <AvatarFallback className="bg-muted text-label font-semibold text-muted-foreground">
            {getPatientInitials(patient.name)}
          </AvatarFallback>
        </Avatar>
        <Link
          href={`/dashboard/patients/${patient.id}`}
          className="min-w-0 after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
        >
          <div className="truncate font-semibold">{patient.name}</div>
          <div className="text-caption text-subtle-foreground">{age ?? "Sem data de nascimento"}</div>
        </Link>
      </div>
      <div className="min-w-0">
        {patient.responsible?.trim() ? (
          <>
            <div className="truncate">{patient.responsible}</div>
            {patient.contact_phone ? (
              <div className="num text-caption text-subtle-foreground">{formatBrazilianPhone(patient.contact_phone)}</div>
            ) : null}
          </>
        ) : (
          <span className="text-subtle-foreground">Não informado</span>
        )}
      </div>
      <div className="min-w-0">
        <div>{lastConsultLabel(row.lastConsultAt, now)}</div>
        {row.lastConsultAt ? <div className="truncate text-caption text-subtle-foreground">{row.lastReason ?? "Consulta"}</div> : null}
      </div>
      <div className="flex gap-1.5">
        {patient.allergies?.trim() ? (
          <AttentionSymbol icon={TriangleAlertIcon} kind="danger" title="Alergia" detail={patient.allergies} />
        ) : null}
        {attention.measure ? (
          <AttentionSymbol icon={RulerIcon} kind="warning" title="Sem medida recente" detail={attention.measure} />
        ) : null}
        {attention.incomplete ? (
          <AttentionSymbol icon={FileWarningIcon} kind="warning" title="Ficha incompleta" detail={attention.incomplete} />
        ) : null}
      </div>
      <div className="relative justify-self-end">
        {inConsult && activeCase ? (
          <Button asChild variant="outline" size="sm">
            <Link href={activeCase.origin === "dashboard" ? `/dashboard/cases/new/${activeCase.id}` : `/dashboard/cases/${activeCase.id}`}>
              Voltar à consulta
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            aria-label={`Atender ${patient.name}`}
            onClick={() =>
              openStartConsult({
                id: patient.id,
                name: patient.name,
                birthDate: patient.birth_date,
                responsible: patient.responsible,
                contactPhone: patient.contact_phone,
                sex: patient.sex,
                lastConsultAt: row.lastConsultAt,
              })
            }
          >
            Atender
          </Button>
        )}
      </div>
    </div>
  )
}

/** "Hoje", "Ontem", "12/09" (até 2 meses), "Há 5 meses", "Há 2 anos". */
function lastConsultLabel(iso: string | null, now: Date): string {
  if (!iso) return "Ainda sem consulta"
  const date = new Date(iso)
  const days = differenceInCalendarDays(now, date)
  if (days === 0) return "Hoje"
  if (days === 1) return "Ontem"
  const months = differenceInMonths(now, date)
  if (months < 2) return format(date, "dd/MM")
  return months < 24 ? `Há ${months} meses` : `Há ${Math.floor(months / 12)} anos`
}
