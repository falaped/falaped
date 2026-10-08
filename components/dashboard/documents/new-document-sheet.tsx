"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { tz } from "@date-fns/tz"
import { Loader2Icon, SearchIcon, TriangleAlertIcon, UserPlusIcon } from "lucide-react"

import {
  getPatientDocumentContextAction,
  listPatientsForSearchAction,
  type PatientDocumentContext,
  type PatientSearchItem,
} from "@/actions"
import { ConsultCertificatePanel } from "@/components/dashboard/cases/consult-certificate-panel"
import { ConsultExamRequestPanel } from "@/components/dashboard/cases/consult-exam-request-panel"
import { ConsultPrescriptionPanel, type ConsultDoctor } from "@/components/dashboard/cases/consult-prescription-panel"
import { ConsultReferralPanel } from "@/components/dashboard/cases/consult-referral-panel"
import { PatientQuickRegister } from "@/components/dashboard/patient-quick-register"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { formatDate } from "@/lib/formatters"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { matchPatientQuery } from "@/lib/match-patient-query"
import type { DocumentKind } from "@/modules/documents/list-documents-by-profile"
import type { ExamCatalogItem } from "@/modules/exam-catalog/types"
import type { ExamPanel } from "@/modules/exam-panels/types"
import type { PrescriptionTemplateOption } from "@/modules/prescription-templates/types"

const TITLE: Record<DocumentKind, string> = {
  prescription: "Nova receita",
  certificate: "Novo atestado",
  "exam-request": "Pedido de exame",
  referral: "Encaminhamento",
}

const RECENT_COUNT = 6

export type NewDocumentRequest = {
  kind: DocumentKind
  /** Já escolhida (ex.: "Novo documento" da consulta encerrada). */
  patientId?: string
  /** Consulta de origem; sem ela, o documento sai "fora da consulta". */
  caseId?: string
  /** "dd/MM" da consulta, para o subtítulo. */
  caseLabel?: string
  /** Modelo de receita ou painel de exames já aplicado ("Usar" em Modelos). */
  templateId?: string
}

export type DocumentPanelData = {
  doctor: ConsultDoctor
  prescriptionTemplates: PrescriptionTemplateOption[]
  examCatalog: ExamCatalogItem[]
  examPanels: ExamPanel[]
}

/**
 * Emitir fora da consulta (protótipo c2a/c2): o mesmo painel da consulta, começando por
 * "Para quem" com a busca do menu e o cadastro rápido.
 */
export function NewDocumentSheet({
  request,
  data,
  onClose,
  onEmitted,
}: {
  request: NewDocumentRequest | null
  data: DocumentPanelData
  onClose: () => void
  onEmitted: () => void
}) {
  // O título fica enquanto o painel anima para fora.
  const [last, setLast] = useState<NewDocumentRequest>({ kind: "prescription" })
  useEffect(() => {
    if (request) setLast(request)
  }, [request])
  const shown = request ?? last

  return (
    <Sheet open={request !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="gap-0 rounded-l-2xl bg-card data-[side=right]:w-[min(1120px,92vw)] data-[side=right]:sm:max-w-none lg:data-[side=right]:w-[min(1120px,82vw)]">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="font-display text-section font-semibold">{TITLE[shown.kind]}</SheetTitle>
          <SheetDescription className="text-caption text-subtle-foreground">
            {shown.caseId ? `Da consulta de ${shown.caseLabel ?? ""}` : "Fora da consulta"}
          </SheetDescription>
        </SheetHeader>
        {request ? <SheetBody key={`${request.kind}-${request.patientId ?? ""}`} request={request} data={data} onEmitted={onEmitted} /> : null}
      </SheetContent>
    </Sheet>
  )
}

function SheetBody({
  request,
  data,
  onEmitted,
}: {
  request: NewDocumentRequest
  data: DocumentPanelData
  onEmitted: () => void
}) {
  const [patientId, setPatientId] = useState<string | null>(request.patientId ?? null)
  const [context, setContext] = useState<PatientDocumentContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Aberto do topo da página, o "agora" é o início do atestado de comparecimento.
  const [openedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    if (!patientId) return
    setContext(null)
    setError(null)
    getPatientDocumentContextAction(patientId).then((result) => {
      if (result.ok) setContext(result)
      else setError(result.error)
    })
  }, [patientId])

  if (!patientId) return <PatientPicker onPick={setPatientId} />
  if (!context) {
    return (
      <p className="flex items-center gap-2 px-6 py-6 text-muted-foreground" role={error ? "alert" : "status"}>
        {error ?? (
          <>
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
            Carregando a criança…
          </>
        )}
      </p>
    )
  }

  const { patient, allergies, lastWeight } = context
  const today = format(new Date(), "yyyy-MM-dd", { in: tz(CLINIC_TIME_ZONE) })
  const weightLabel = lastWeight
    ? `${(lastWeight.grams / 1000).toFixed(2).replace(".", ",")} kg · ${
        lastWeight.measuredOn === today ? "hoje" : formatDate(lastWeight.measuredOn)
      }`
    : null
  const age = patient.birth_date ? formatPediatricAgeShort(computePediatricAge(patient.birth_date)) : null
  const caseId = request.caseId ?? null

  return (
    <>
      <section className="flex flex-col gap-2 border-b border-border px-6 py-4">
        <h3 className="font-display text-title font-semibold">Para quem</h3>
        <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-caption font-semibold text-primary-ink-strong">
            {getPatientInitials(patient.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate">
              <span className="font-semibold">{patient.name}</span>
              {age ? <span className="text-subtle-foreground"> · {age}</span> : null}
            </div>
            <div className="text-caption text-muted-foreground">
              {lastWeight ? (
                <>
                  Última medida: <span className="num">{weightLabel?.replace(" · ", " em ")}</span>
                </>
              ) : (
                "Sem medida de peso"
              )}
            </div>
          </div>
          {allergies.length ? (
            <Badge variant="destructive" className="max-w-64 truncate">
              <TriangleAlertIcon aria-hidden />
              Alergia: {allergies.join(", ")}
            </Badge>
          ) : null}
          {request.patientId ? null : (
            <Button variant="ghost" size="sm" onClick={() => setPatientId(null)}>
              Trocar
            </Button>
          )}
        </div>
      </section>
      {request.kind === "prescription" ? (
        <ConsultPrescriptionPanel
          caseId={caseId}
          patient={patient}
          allergies={allergies}
          weightLabel={weightLabel}
          templates={data.prescriptionTemplates}
          initialTemplateId={request.templateId}
          doctor={data.doctor}
          onDone={onEmitted}
        />
      ) : null}
      {request.kind === "certificate" ? (
        <ConsultCertificatePanel caseId={caseId} patient={patient} startedAt={openedAt} doctor={data.doctor} onDone={onEmitted} />
      ) : null}
      {request.kind === "exam-request" ? (
        <ConsultExamRequestPanel
          caseId={caseId}
          patient={patient}
          catalog={data.examCatalog}
          panels={data.examPanels}
          initialPanelId={request.templateId}
          doctor={data.doctor}
          onDone={onEmitted}
        />
      ) : null}
      {request.kind === "referral" ? (
        <ConsultReferralPanel caseId={caseId} patient={patient} doctor={data.doctor} onDone={onEmitted} />
      ) : null}
    </>
  )
}

/** A busca do menu (⌘K) dentro do painel: Recentes primeiro, cadastro rápido se não achar. */
function PatientPicker({ onPick }: { onPick: (patientId: string) => void }) {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientSearchItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [registering, setRegistering] = useState<string | null>(null)

  useEffect(() => {
    listPatientsForSearchAction().then((result) => {
      if (result.ok) setPatients(result.patients)
      else setError(result.error)
    })
  }, [])

  if (registering !== null) {
    return (
      <div className="overflow-auto">
        <PatientQuickRegister
          forDocument
          initialName={registering}
          busy={false}
          onBack={() => setRegistering(null)}
          onCreated={(patient) => onPick(patient.id)}
          onFullForm={() => router.push("/dashboard/patients/new")}
        />
      </div>
    )
  }

  const recents = (patients ?? [])
    .filter((patient) => patient.lastConsultAt)
    .sort((a, b) => b.lastConsultAt!.localeCompare(a.lastConsultAt!))
    .slice(0, RECENT_COUNT)
  const listed = query.trim()
    ? (patients ?? []).filter((patient) => matchPatientQuery(patient, query))
    : recents.length
      ? recents
      : (patients ?? [])
  const firstName = query.trim().split(" ")[0]

  return (
    <section className="flex min-h-0 flex-col gap-2 px-6 py-5">
      <h3 className="font-display text-title font-semibold">Para quem</h3>
      <Command shouldFilter={false} className="h-auto rounded-xl border border-border">
        <CommandInput
          autoFocus
          value={query}
          onValueChange={setQuery}
          onKeyDown={(event) => {
            if (event.key === "Enter" && patients && query.trim() && listed.length === 0) setRegistering(query.trim())
          }}
          placeholder="Nome, responsável ou telefone"
        />
        <CommandList className="max-h-[420px]">
          {patients ? (
            <>
              {listed.length ? (
                <CommandGroup heading={listed === recents ? "Recentes" : "Pacientes"}>
                  {listed.map((patient) => {
                    const age = formatPediatricAgeShort(computePediatricAge(patient.birthDate))
                    return (
                      <CommandItem
                        key={patient.id}
                        value={patient.id}
                        onSelect={() => onPick(patient.id)}
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
                        <kbd className="hidden rounded border border-border bg-card px-1.5 py-0.5 font-sans text-caption text-subtle-foreground group-data-[selected=true]:inline">
                          ↵
                        </kbd>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ) : query.trim() ? (
                <p className="px-4 pt-4 text-center text-muted-foreground">Nenhum paciente com &ldquo;{query.trim()}&rdquo;.</p>
              ) : null}
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => setRegistering(query.trim())}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-primary-ink hover:bg-accent"
                >
                  <UserPlusIcon className="size-4" aria-hidden />
                  {firstName ? `Cadastrar "${firstName}" e continuar` : "Cadastrar paciente"}
                </button>
              </div>
            </>
          ) : (
            <p className="flex items-center justify-center gap-2 px-4 py-6 text-muted-foreground" role={error ? "alert" : "status"}>
              {error ?? (
                <>
                  <SearchIcon className="size-4" aria-hidden />
                  Carregando pacientes…
                </>
              )}
            </p>
          )}
        </CommandList>
      </Command>
    </section>
  )
}
