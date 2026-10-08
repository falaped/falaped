"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SearchIcon, XIcon } from "lucide-react"

import { listPatientsForSearchAction, type PatientSearchItem } from "@/actions"
import { SectionTab } from "@/components/dashboard/section-tab"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CommandDialog, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { matchPatientQuery } from "@/lib/match-patient-query"
import { cn } from "@/lib/utils"
import { CANONICAL_VACCINE_BANDS, bandForItemMonths } from "@/lib/vaccine-bands"
import type { VaccineScheduleItem, VaccineScheduleWithItems } from "@/modules/vaccines/types"

export type VaccineChild = { id: string; name: string; age: string | null; band: string | null }

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const bandId = (label: string) => `faixa-${label.replace(/\s+/g, "-")}`

/** "PNI 2025, vigência jan/2025". */
const source = (schedule: VaccineScheduleWithItems) => {
  const [year, month] = schedule.effective_date.split("-")
  return `${schedule.version}, vigência ${MONTHS[Number(month) - 1] ?? month}/${year}`
}

function groupByBand(schedule: VaccineScheduleWithItems | null) {
  const byBand = new Map<string, VaccineScheduleItem[]>()
  for (const item of schedule?.vaccine_schedule_items ?? []) {
    const label = bandForItemMonths(item.age_months)?.label
    if (label) byBand.set(label, [...(byBand.get(label) ?? []), item])
  }
  return byBand
}

/**
 * Calendário de vacinas (protótipo f1–f2): abas Criança e Gestante. Na Criança, uma linha
 * por faixa com SUS e particular lado a lado; com uma criança escolhida, a faixa dela
 * fica destacada e a página rola até lá.
 */
export function VaccinesView({
  sus,
  sbim,
  gestante,
  child,
}: {
  sus: VaccineScheduleWithItems | null
  sbim: VaccineScheduleWithItems | null
  gestante: VaccineScheduleWithItems | null
  child: VaccineChild | null
}) {
  const [picking, setPicking] = useState(false)
  const current = useRef<HTMLDivElement>(null)
  const susByBand = groupByBand(sus)
  const sbimByBand = groupByBand(sbim)
  const sources = [sus, sbim].filter((schedule) => schedule !== null).map(source)

  useEffect(() => {
    current.current?.scrollIntoView({ block: "center" })
  }, [child?.id])

  return (
    <>
      <section className="flex items-center gap-6 rounded-xl border border-primary-soft-border bg-highlight px-8 py-7 shadow-sm">
        <div>
          <h1 className="font-display text-display font-semibold">Calendário de vacinas</h1>
          <p className="mt-1 text-read text-muted-foreground">Referência por idade, SUS e particular lado a lado</p>
        </div>
        {child ? null : (
          <Button variant="outline" size="lg" className="ml-auto" onClick={() => setPicking(true)}>
            <SearchIcon data-icon="inline-start" />
            Ver para uma criança
          </Button>
        )}
      </section>

      {child ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary-soft-border bg-primary-soft px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-label font-semibold text-primary-ink-strong">
            {getPatientInitials(child.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">
              {child.name}
              {child.age ? <span className="font-normal text-muted-foreground"> · {child.age}</span> : null}
            </div>
            <div className="text-caption text-muted-foreground">
              {child.band ? (
                <>
                  Faixa atual: <b className="text-foreground">{child.band}</b>. As doses dela ficam na ficha.
                </>
              ) : (
                "Sem data de nascimento na ficha, então não dá para destacar a faixa."
              )}
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/patients/${child.id}`}>Abrir ficha</Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm" aria-label="Tirar a criança">
            <Link href="/dashboard/vaccines" scroll={false}>
              <XIcon />
            </Link>
          </Button>
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card">
        <Tabs defaultValue="child" className="gap-0">
          <div className="flex items-end gap-6 border-b border-border px-5 pt-4">
            <TabsList className="h-auto w-auto gap-5 rounded-none bg-transparent p-0 lg:w-auto">
              <SectionTab value="child">Criança</SectionTab>
              <SectionTab value="pregnant">Gestante</SectionTab>
            </TabsList>
          </div>

          <TabsContent value="child" className="mt-0">
            {sus || sbim ? (
              <>
                <nav aria-label="Faixas de idade" className="flex flex-wrap gap-1.5 border-b border-border px-5 py-3">
                  {CANONICAL_VACCINE_BANDS.map(({ label }) => (
                    <Badge key={label} asChild variant={label === child?.band ? "default" : "secondary"}>
                      <button type="button" onClick={() => document.getElementById(bandId(label))?.scrollIntoView({ block: "start", behavior: "smooth" })}>
                        {label}
                      </button>
                    </Badge>
                  ))}
                </nav>
                <div className="grid grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] gap-6 border-b border-border bg-muted px-5 py-2.5 text-label font-medium text-muted-foreground">
                  <span>Idade</span>
                  <span>SUS/PNI</span>
                  <span>Particular</span>
                </div>
                <div className="divide-y divide-border">
                  {CANONICAL_VACCINE_BANDS.map(({ label }) => {
                    const isCurrent = label === child?.band
                    const particular = sbimByBand.get(label) ?? []
                    return (
                      <div
                        key={label}
                        id={bandId(label)}
                        ref={isCurrent ? current : undefined}
                        aria-current={isCurrent ? "true" : undefined}
                        className={cn(
                          "grid scroll-mt-4 grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] gap-6 px-5 py-3",
                          isCurrent && "bg-primary-soft/60 shadow-[inset_3px_0_0_var(--primary)]",
                        )}
                      >
                        <div className="pt-1">
                          <div className="font-semibold">{label}</div>
                          {isCurrent ? <Badge className="mt-1">Idade atual</Badge> : null}
                        </div>
                        <VaccineList items={susByBand.get(label) ?? []} empty="—" />
                        <VaccineList items={particular} empty="Mesmo do SUS" />
                      </div>
                    )
                  })}
                </div>
                <p className="border-t border-border px-5 py-3 text-caption text-subtle-foreground">
                  Fontes: {sources.join("; ")}. Confira sempre contra o calendário oficial atual.
                </p>
              </>
            ) : (
              <Unavailable />
            )}
          </TabsContent>

          <TabsContent value="pregnant" className="mt-0">
            {gestante ? (
              <>
                <div className="grid grid-cols-[minmax(0,1fr)_260px] gap-4 border-b border-border bg-muted px-5 py-2.5 text-label font-medium text-muted-foreground">
                  <span>Vacina</span>
                  <span>Quando</span>
                </div>
                <div className="divide-y divide-border">
                  {gestante.vaccine_schedule_items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_260px] items-center gap-4 px-5 py-3">
                      <VaccineName item={item} />
                      <span>{item.age_label}</span>
                    </div>
                  ))}
                </div>
                <p className="border-t border-border px-5 py-3 text-caption text-subtle-foreground">
                  Fonte: {source(gestante)}. Confira sempre contra o calendário oficial atual.
                </p>
              </>
            ) : (
              <Unavailable />
            )}
          </TabsContent>
        </Tabs>
      </section>

      <ChildPicker open={picking} onOpenChange={setPicking} />
    </>
  )
}

function VaccineName({ item }: { item: VaccineScheduleItem }) {
  return (
    <div>
      <span className="font-medium">{item.vaccine}</span>
      {item.dose ? <span className="text-muted-foreground"> · {item.dose}</span> : null}
      {item.notes ? <div className="text-caption text-subtle-foreground">{item.notes}</div> : null}
    </div>
  )
}

function VaccineList({ items, empty }: { items: VaccineScheduleItem[]; empty: string }) {
  if (!items.length) return <span className="pt-1 text-subtle-foreground">{empty}</span>
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} className="py-1">
          <VaccineName item={item} />
        </li>
      ))}
    </ul>
  )
}

function Unavailable() {
  return (
    <p className="px-5 py-10 text-center text-muted-foreground">
      Calendário indisponível. Atualize a página ou tente de novo mais tarde.
    </p>
  )
}

/** Busca de pacientes do menu, mas escolher só destaca a faixa da criança aqui. */
function ChildPicker({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientSearchItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!open || patients) return
    listPatientsForSearchAction().then((result) => {
      if (result.ok) setPatients(result.patients)
      else setError(result.error)
    })
  }, [open, patients])

  const recents = (patients ?? [])
    .filter((patient) => patient.lastConsultAt)
    .sort((a, b) => b.lastConsultAt!.localeCompare(a.lastConsultAt!))
    .slice(0, 6)
  const listed = query.trim()
    ? (patients ?? []).filter((patient) => matchPatientQuery(patient, query))
    : recents.length
      ? recents
      : (patients ?? [])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Ver para uma criança">
      <CommandInput value={query} onValueChange={setQuery} placeholder="Nome, responsável ou telefone" />
      <CommandList className="max-h-[400px]">
        {patients ? (
          listed.length ? (
            <CommandGroup heading={listed === recents ? "Recentes" : "Pacientes"}>
              {listed.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={patient.id}
                  onSelect={() => {
                    onOpenChange(false)
                    router.push(`/dashboard/vaccines?patientId=${patient.id}`, { scroll: false })
                  }}
                  className="gap-3 rounded-lg px-3 py-2.5"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-caption font-semibold text-muted-foreground">
                    {getPatientInitials(patient.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-semibold text-foreground">{patient.name}</span>
                    <span className="text-subtle-foreground">
                      {[formatPediatricAgeShort(computePediatricAge(patient.birthDate)), patient.responsible]
                        .filter(Boolean)
                        .map((part) => ` · ${part}`)
                        .join("")}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <p className="px-4 py-6 text-center text-muted-foreground">
              {query.trim() ? <>Nenhum paciente com &ldquo;{query.trim()}&rdquo;.</> : "Nenhum paciente cadastrado ainda."}
            </p>
          )
        ) : (
          <p className="px-4 py-6 text-center text-muted-foreground" role={error ? "alert" : "status"}>
            {error ?? "Carregando pacientes…"}
          </p>
        )}
      </CommandList>
    </CommandDialog>
  )
}
