"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { differenceInCalendarDays, format, subMonths } from "date-fns"
import {
  ArrowLeftIcon,
  BellIcon,
  CalculatorIcon,
  CircleDotIcon,
  FilePenLineIcon,
  FileWarningIcon,
  PencilIcon,
  RulerIcon,
  StethoscopeIcon,
  Trash2Icon,
  TriangleAlertIcon,
  WeightIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { deletePatientAction } from "@/actions"
import { AttachmentsSection } from "@/components/dashboard/attachments/attachments-section"
import { AttentionSymbol } from "@/components/dashboard/attention-symbol"
import { openStartConsult } from "@/components/dashboard/patient-search"
import { ExamReadingsSection } from "@/components/dashboard/exam-readings/exam-readings-section"
import type { ExamReadingWithPages } from "@/components/dashboard/exam-readings/exam-reading-card"
import { GrowthSection } from "@/components/dashboard/patients/growth/growth-section"
import { PatientDetailTimeline } from "@/components/dashboard/patients/patient-detail-timeline"
import { PatientVaccineCalendarSection } from "@/components/dashboard/patients/patient-vaccine-calendar-section"
import { ScalesSection } from "@/components/dashboard/scales/scales-section"
import { SectionTab } from "@/components/dashboard/section-tab"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { formatBrazilianPhone, formatDate } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { computePediatricBmi } from "@/lib/parse-anthropometrics-for-bmi"
import { getPatientChartBmiLabel } from "@/lib/patient-chart-bmi"
import { getPatientAttention } from "@/lib/patient-attention"
import { formatPatientSexForDisplay } from "@/modules/patients/patient-sex"
import { cn } from "@/lib/utils"
import type { CaseCarryover } from "@/modules/cases/get-previous-case-carryover"
import type { ConsultationRow, Consultations } from "@/modules/cases/get-consultations"
import type { MedicalCertificateListItem } from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"
import type { PatientAttachment } from "@/modules/patient-attachments/types"
import type { Measurement } from "@/modules/patient-growth/types"
import type { ScaleResult } from "@/modules/patient-scales/types"
import type { Patient } from "@/modules/patients/types"
import type { PrescriptionListItem } from "@/modules/prescriptions/types"
import type { VaccineScheduleWithItems } from "@/modules/vaccines/types"

type Tab = "summary" | "data" | "consults" | "growth" | "vaccines" | "exams" | "documents" | "scales" | "attachments"

/** Quantos meses de consultas o Histórico do Resumo mostra. */
const HISTORY_MONTHS = 3
const TAB_BY_HASH: Record<string, Tab> = { "#dados": "data", "#crescimento": "growth" }

/**
 * Ficha (protótipo b5): cabeçalho com os símbolos de atenção e as abas; o Resumo lê em
 * três faixas (o essencial em números, última consulta ao lado do que fazer, histórico ao
 * lado do crescimento) e as outras abas abrem as seções completas.
 */
export function PatientDetailView({
  patient,
  consultations,
  certificates = [],
  prescriptions = [],
  photoUrl = null,
  measurements = [],
  vaccineSus = null,
  vaccineSbim = null,
  takenVaccineItemIds = [],
  scaleResults = [],
  ageMonths = null,
  attachments = [],
  examReadings = [],
  lastCarryover = null,
}: {
  patient: Patient
  /** Consultas desta criança, mais recente primeiro; `active` só se for dela. */
  consultations: Consultations
  certificates?: MedicalCertificateListItem[]
  prescriptions?: PrescriptionListItem[]
  /** Signed URL (short-lived) resolved server-side for the avatar; null falls back to initials. */
  photoUrl?: string | null
  /** Medidas da mais antiga para a mais recente. */
  measurements?: Measurement[]
  /** Global reference calendars (D-07) for the vaccine calendar carousel; null degrades gracefully. */
  vaccineSus?: VaccineScheduleWithItems | null
  vaccineSbim?: VaccineScheduleWithItems | null
  /** Reference item ids already marked TAKEN for this patient (VAC-05). */
  takenVaccineItemIds?: string[]
  /** Histórico de escalas aplicadas, da mais recente para a mais antiga. */
  scaleResults?: ScaleResult[]
  /** Idade cronológica em meses inteiros, derivada no servidor; null sem data de nascimento. */
  ageMonths?: number | null
  /** Anexos do paciente, do mais recente para o mais antigo. */
  attachments?: PatientAttachment[]
  /** Leituras de exame com IA, pela ficha ou nas consultas, mais recente primeiro. */
  examReadings?: ExamReadingWithPages[]
  /** Resumo e lembretes da última consulta; null quando não há. */
  lastCarryover?: CaseCarryover | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [tab, setTab] = useState<Tab>("summary")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // O Next pode reaproveitar este componente entre pacientes; volta ao Resumo ou à aba da âncora
  // (#dados depois de salvar a edição, #crescimento no "Registrar medida").
  useEffect(() => {
    setTab(TAB_BY_HASH[window.location.hash] ?? "summary")
  }, [pathname, patient.id])

  const now = new Date()
  const { active, rows } = consultations
  const closed = rows.filter((row) => row.status === "closed")
  const recent = closed.filter((row) => row.startedAt >= subMonths(now, HISTORY_MONTHS).toISOString())
  const lastMeasure = measurements.findLast((m) => m.weight_grams !== null || m.length_height_mm !== null)
  const attention = getPatientAttention(
    { patient, lastConsultAt: active?.startedAt ?? rows[0]?.startedAt ?? null, lastMeasuredOn: lastMeasure?.measured_on ?? null },
    now,
  )
  const drafts = rows.filter((row) => row.reportDraft)
  const editHref = `/dashboard/patients/${patient.id}/editar`
  const age = patient.birth_date ? formatPediatricAgeShort(computePediatricAge(patient.birth_date)) : null

  async function handleConfirmDelete() {
    setDeleteLoading(true)
    try {
      const result = await deletePatientAction(patient.id)
      if (result.ok) {
        toast.success("Paciente excluído.")
        router.push("/dashboard/patients")
        return
      }
      toast.error(getFriendlyToastMessage(result.error))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="gap-0">
      <header className="-mx-8 -mt-8 border-b border-border bg-card">
        <div className="max-w-[1440px] px-8 pt-6">
          <Button asChild variant="ghost" size="sm" className="-ml-2.5 mb-2 text-muted-foreground">
            <Link href="/dashboard/patients">
              <ArrowLeftIcon data-icon="inline-start" />
              Voltar para pacientes
            </Link>
          </Button>
          <div className="flex items-start gap-4">
            <Avatar className="size-14">
              {photoUrl ? <AvatarImage src={photoUrl} alt={`Foto de ${patient.name}`} /> : null}
              <AvatarFallback className="bg-primary-soft text-section font-semibold text-primary-ink-strong">
                {getPatientInitials(patient.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-page font-semibold">{patient.name}</h1>
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
              </div>
              <div className="mt-1 text-muted-foreground">
                {[
                  age ? <span key="age" className="font-medium text-foreground">{age}</span> : "Sem data de nascimento",
                  patient.birth_date ? <span key="birth">nasc. <span className="num">{formatDate(patient.birth_date)}</span></span> : null,
                  patient.responsible?.trim() || null,
                  patient.contact_phone ? <span key="phone" className="num">{formatBrazilianPhone(patient.contact_phone)}</span> : null,
                ]
                  .filter(Boolean)
                  .map((part, index) => (
                    <span key={index}>
                      {index ? " · " : ""}
                      {part}
                    </span>
                  ))}
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Button asChild variant="outline">
                <Link href={editHref}>
                  <PencilIcon data-icon="inline-start" />
                  Editar
                </Link>
              </Button>
              {active ? (
                <Button asChild>
                  <Link href={active.origin === "dashboard" ? `/dashboard/cases/new/${active.id}` : `/dashboard/cases/${active.id}`}>
                    <StethoscopeIcon data-icon="inline-start" />
                    Voltar à consulta
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    openStartConsult({
                      id: patient.id,
                      name: patient.name,
                      birthDate: patient.birth_date,
                      responsible: patient.responsible,
                      contactPhone: patient.contact_phone,
                      sex: patient.sex,
                      lastConsultAt: rows[0]?.startedAt ?? null,
                    })
                  }
                >
                  <StethoscopeIcon data-icon="inline-start" />
                  Iniciar consulta
                </Button>
              )}
            </div>
          </div>
          <div className="mt-5 flex items-end">
            <TabsList className="h-auto w-auto gap-5 rounded-none bg-transparent p-0 lg:w-auto">
              <SectionTab value="summary">Resumo</SectionTab>
              <SectionTab value="data">Dados</SectionTab>
              <SectionTab value="consults">
                Consultas
                <span className="num text-caption text-subtle-foreground">{closed.length}</span>
              </SectionTab>
              <SectionTab value="growth">Crescimento</SectionTab>
              <SectionTab value="scales">Escalas</SectionTab>
              <SectionTab value="vaccines">Vacinas</SectionTab>
              <SectionTab value="exams">Exames</SectionTab>
              <SectionTab value="documents">Documentos</SectionTab>
              <SectionTab value="attachments">Anexos</SectionTab>
            </TabsList>
            {/* Longe de Editar e Iniciar consulta: ação rara e sem volta, à vista mas sem peso. */}
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 ml-auto text-muted-foreground hover:bg-danger-soft hover:text-danger-text"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              Excluir paciente
            </Button>
          </div>
        </div>
      </header>

      <div className="flex w-full max-w-[1440px] flex-col gap-6 pt-8">
        <TabsContent value="summary" className="mt-0 flex flex-col gap-6">
          <ClinicalFacts patient={patient} measurements={measurements} now={now} onShowData={() => setTab("data")} />

          <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className="flex flex-col rounded-xl border border-border bg-card">
              <div className="flex items-baseline gap-2 px-5 pt-5 pb-3">
                <h2 className="font-display text-section font-semibold">Histórico</h2>
                <span className="text-caption text-subtle-foreground">últimos {HISTORY_MONTHS} meses</span>
                {closed.length > recent.length ? (
                  <Button variant="link" size="sm" className="ml-auto" onClick={() => setTab("consults")}>
                    Ver todas as {closed.length} consultas
                  </Button>
                ) : null}
              </div>
              <ConsultHistory
                rows={recent}
                carryover={lastCarryover}
                empty={closed.length ? `Nenhuma consulta nos últimos ${HISTORY_MONTHS} meses.` : undefined}
              />
            </section>
            <section className="flex flex-col rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <h2 className="font-display text-section font-semibold">O que fazer</h2>
              </div>
              <div className="flex-1 divide-y divide-border border-t border-border">
                {!attention.measure && !attention.incomplete && drafts.length === 0 ? (
                  <p className="px-5 py-6 text-muted-foreground">Nada pendente: ficha completa, medidas em dia e relatórios finalizados.</p>
                ) : null}
                {drafts.map((row) => (
                  <TodoRow
                    key={row.id}
                    symbol={<AttentionSymbol icon={FilePenLineIcon} kind="warning" title="Relatório em rascunho" detail="Finalize para imprimir e enviar." />}
                    title="Finalizar o relatório"
                    detail={`Consulta de ${format(new Date(row.startedAt), "dd/MM")}`}
                  >
                    <Button asChild variant="outline" size="xs">
                      <Link href={`/dashboard/cases/${row.id}`}>Finalizar</Link>
                    </Button>
                  </TodoRow>
                ))}
                {attention.measure ? (
                  <TodoRow
                    symbol={<AttentionSymbol icon={RulerIcon} kind="warning" title="Sem medida recente" detail={attention.measure} />}
                    title="Medir peso e altura"
                    detail={attention.measure}
                  >
                    <Button variant="outline" size="xs" onClick={() => setTab("growth")}>
                      Registrar
                    </Button>
                  </TodoRow>
                ) : null}
                {attention.incomplete ? (
                  <TodoRow
                    symbol={<AttentionSymbol icon={FileWarningIcon} kind="warning" title="Ficha incompleta" detail={attention.incomplete} />}
                    title="Completar a ficha"
                    detail={attention.incomplete}
                  >
                    <Button asChild variant="outline" size="xs">
                      <Link href={`${editHref}#${patient.birth_date ? "contato" : "crianca"}`}>Completar</Link>
                    </Button>
                  </TodoRow>
                ) : null}
              </div>
            </section>
          </div>
        </TabsContent>

            <TabsContent value="data" className="mt-0">
              <PatientData patient={patient} editHref={editHref} />
            </TabsContent>
            <TabsContent value="consults" className="mt-0">
              <section className="rounded-xl border border-border bg-card">
                <ConsultHistory rows={closed} carryover={lastCarryover} />
              </section>
            </TabsContent>
            <TabsContent value="growth" className="mt-0">
              <GrowthSection patient={patient} measurements={measurements} />
            </TabsContent>
            <TabsContent value="vaccines" className="mt-0">
              <PatientVaccineCalendarSection
                patientId={patient.id}
                birthDate={patient.birth_date}
                gestationalAgeWeeks={patient.gestational_age_weeks}
                sus={vaccineSus}
                sbim={vaccineSbim}
                takenItemIds={takenVaccineItemIds}
              />
            </TabsContent>
            <TabsContent value="exams" className="mt-0">
              <ExamReadingsSection patientId={patient.id} readings={examReadings} />
            </TabsContent>
            <TabsContent value="documents" className="mt-0">
              <PatientDetailTimeline certificates={certificates} prescriptions={prescriptions} />
            </TabsContent>
            <TabsContent value="scales" className="mt-0">
              <ScalesSection patientId={patient.id} ageMonths={ageMonths} results={scaleResults} />
            </TabsContent>
            <TabsContent value="attachments" className="mt-0">
              <AttachmentsSection patientId={patient.id} attachments={attachments} />
            </TabsContent>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleteLoading && setDeleteOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a ficha de {patient.name.split(" ")[0]}?</AlertDialogTitle>
            <AlertDialogDescription>
              Não dá para desfazer. As consultas continuam salvas, mas ficam sem paciente associado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" className="border-danger-border bg-danger-soft" disabled={deleteLoading} onClick={handleConfirmDelete}>
              {deleteLoading ? "Excluindo…" : "Excluir paciente"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  )
}

/** Faixa 1: peso, altura, perímetro cefálico, IMC e alergias, com os demais dados clínicos sob demanda. */
function ClinicalFacts({
  patient,
  measurements,
  now,
  onShowData,
}: {
  patient: Patient
  measurements: Measurement[]
  now: Date
  onShowData: () => void
}) {
  const number = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
  const latest = <K extends keyof Measurement>(key: K) => measurements.findLast((m) => m[key] !== null)
  const weight = latest("weight_grams")
  const height = latest("length_height_mm")
  const head = latest("head_circumference_mm")
  // IMC só com peso e altura da MESMA medição (D-11), como na tabela de medidas; sem medição, usa a ficha.
  const bmiSource = measurements.findLast((m) => m.weight_grams !== null && m.length_height_mm !== null)
  const bmiResult = bmiSource ? computePediatricBmi(bmiSource.weight_grams! / 1000, bmiSource.length_height_mm! / 1000) : null
  const bmi = bmiResult?.ok ? number(bmiResult.bmi) : bmiSource ? null : getPatientChartBmiLabel(patient)
  const measuredNote = (m: Measurement | undefined, fromChart: string | null, verb: string) => {
    if (m) {
      const days = differenceInCalendarDays(now, new Date(`${m.measured_on}T12:00:00`))
      return days === 0 ? `${verb} hoje` : days < 60 ? `${verb} há ${days} dias` : `${verb} em ${formatDate(m.measured_on)}`
    }
    return fromChart ? "Da ficha" : "Sem registro"
  }
  const extras = [
    patient.current_medications?.trim() ? `Em uso: ${patient.current_medications.trim()}` : "Sem uso contínuo",
    patient.gestational_age_weeks ? `IG ${patient.gestational_age_weeks} semanas` : null,
    patient.blood_type?.trim() ? `Tipo sanguíneo ${patient.blood_type.trim()}` : "Tipo sanguíneo não informado",
  ].filter(Boolean)
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="grid grid-cols-5 divide-x divide-border">
        <Fact
          icon={WeightIcon}
          label="Peso"
          value={weight?.weight_grams ? `${number(weight.weight_grams / 1000)} kg` : patient.weight?.trim() ? `${patient.weight.trim()} kg` : "—"}
          note={measuredNote(weight, patient.weight, "Medido")}
        />
        <Fact
          icon={RulerIcon}
          label="Altura"
          value={height?.length_height_mm ? `${number(height.length_height_mm / 10)} cm` : patient.height?.trim() ? `${patient.height.trim()} cm` : "—"}
          note={measuredNote(height, patient.height, "Medida")}
        />
        <Fact
          icon={CircleDotIcon}
          label="Perímetro cefálico"
          value={
            head?.head_circumference_mm
              ? `${number(head.head_circumference_mm / 10)} cm`
              : patient.head_circumference?.trim()
                ? `${patient.head_circumference.trim()} cm`
                : "—"
          }
          note={measuredNote(head, patient.head_circumference, "Medido")}
        />
        <Fact
          icon={CalculatorIcon}
          label="IMC"
          value={bmi ? `${bmi} kg/m²` : "—"}
          note={bmi ? (bmiSource ? `Da medida de ${formatDate(bmiSource.measured_on)}` : "Da ficha") : "Precisa de peso e altura"}
        />
        <Fact
          icon={TriangleAlertIcon}
          label="Alergias"
          value={patient.allergies?.trim() || "Nenhuma informada"}
          note={patient.allergies?.trim() ? "Checada em toda receita" : "Confirme na consulta"}
          tone={patient.allergies?.trim() ? "text-danger-text" : undefined}
        />
      </div>
      <div className="flex items-center gap-2 border-t border-border px-5 py-2.5 text-caption text-muted-foreground">
        <span className="truncate">{extras.join(" · ")}</span>
        <button type="button" onClick={onShowData} className="ml-auto shrink-0 cursor-pointer text-primary-ink hover:underline">
          Ver todos os dados
        </button>
      </div>
    </section>
  )
}

function Fact({ icon: Icon, label, value, note, tone }: { icon: LucideIcon; label: string; value: string; note: string; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-5 py-4">
      <div className="flex items-center gap-1.5 text-label text-muted-foreground">
        <Icon className={cn("size-3.5", tone)} aria-hidden />
        {label}
      </div>
      <div className="num truncate text-title font-semibold">{value}</div>
      <div className={cn("text-caption", tone ?? "text-subtle-foreground")}>{note}</div>
    </div>
  )
}

/** Aba Dados: todos os campos da ficha, agrupados, com o que falta à vista. */
function PatientData({ patient, editHref }: { patient: Patient; editHref: string }) {
  const age = patient.birth_date ? formatPediatricAgeShort(computePediatricAge(patient.birth_date)) : null
  const groups: [string, string, [string, React.ReactNode][]][] = [
    [
      "Identificação",
      "crianca",
      [
        ["Nome", patient.name],
        ["Nascimento", patient.birth_date ? `${formatDate(patient.birth_date)}${age ? ` (${age})` : ""}` : null],
        ["Sexo", patient.sex ? formatPatientSexForDisplay(patient.sex) : null],
        ["Idade gestacional ao nascer", patient.gestational_age_weeks ? `${patient.gestational_age_weeks} semanas` : null],
        ["Tipo sanguíneo", patient.blood_type],
      ],
    ],
    [
      "Responsável e contato",
      "contato",
      [
        ["Responsável", patient.responsible],
        ["Telefone", patient.contact_phone ? formatBrazilianPhone(patient.contact_phone) : null],
        ["Responsável legal", patient.legal_guardian],
        ["Endereço", patient.address],
        ["Família", patient.family_notes],
      ],
    ],
    [
      "Saúde",
      "saude",
      [
        ["Alergias", patient.allergies],
        ["Medicações em uso", patient.current_medications],
        ["Histórico médico", patient.medical_history],
      ],
    ],
  ]

  return (
    <div className="grid items-start gap-5 lg:grid-cols-3">
      {groups.map(([title, section, fields]) => (
        <section key={title} className="rounded-xl border border-border bg-card">
          <div className="flex items-center px-5 pt-5 pb-3">
            <h2 className="font-display text-section font-semibold">{title}</h2>
            <Button asChild variant="ghost" size="sm" className="ml-auto">
              <Link href={`${editHref}#${section}`}>Editar</Link>
            </Button>
          </div>
          <dl className="divide-y divide-border border-t border-border">
            {fields.map(([label, value]) => (
              <div key={label} className="px-5 py-3">
                <dt className="text-label text-muted-foreground">{label}</dt>
                <dd className={cn("mt-0.5 whitespace-pre-wrap", !(typeof value === "string" ? value.trim() : value) && "text-subtle-foreground")}>
                  {(typeof value === "string" ? value.trim() : value) || "Não informado"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}

function TodoRow({ symbol, title, detail, children }: { symbol: React.ReactNode; title: string; detail: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      {symbol}
      <div className="min-w-0 flex-1">
        <div className="font-medium">{title}</div>
        <div className="truncate text-caption text-muted-foreground">{detail}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/** Linha do tempo das consultas: data, motivo e documentos; a mais recente vem aberta com o resumo e os lembretes. */
function ConsultHistory({ rows, carryover, empty }: { rows: ConsultationRow[]; carryover: CaseCarryover | null; empty?: string }) {
  if (rows.length === 0) {
    return <p className="border-t border-border px-5 py-6 text-muted-foreground">{empty ?? "As consultas encerradas desta criança aparecem aqui."}</p>
  }
  return (
    <ol className="flex-1 border-t border-border px-5 py-2">
      {rows.map((row, index) => {
        const open = index === 0 && carryover?.caseId === row.id ? carryover : null
        return (
          <li key={row.id} className="relative flex gap-4 py-3">
            <span className="num w-12 shrink-0 text-caption text-subtle-foreground">{format(new Date(row.startedAt), "dd/MM")}</span>
            <span className="relative mt-1.5 flex flex-col items-center">
              <span className={cn("size-2.5 rounded-full", index === 0 ? "bg-primary" : "border-2 border-border-strong bg-card")} />
              {index < rows.length - 1 ? <span className="absolute top-4 h-[calc(100%+12px)] w-px bg-border" /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <Link href={`/dashboard/cases/${row.id}`} className="min-w-0 flex-1 hover:underline">
                  <div className="font-medium">{row.reason ?? "Consulta"}</div>
                  <div className="text-caption text-muted-foreground">{format(new Date(row.startedAt), "dd/MM/yyyy")}</div>
                </Link>
                <span className="flex flex-wrap justify-end gap-1">
                  {row.documents.map((label) => (
                    <Badge key={label} variant="default">
                      {label}
                    </Badge>
                  ))}
                </span>
              </div>
              {open?.summary ? <p className="mt-2 max-w-[70ch] whitespace-pre-wrap text-muted-foreground">{open.summary}</p> : null}
              {open?.reminders.map((reminder, i) => (
                <div key={i} className="mt-2 flex items-center gap-2 rounded-lg border border-primary-soft-border bg-highlight px-3 py-2 text-label">
                  <BellIcon className="size-3.5 shrink-0 text-primary-ink" aria-hidden />
                  <span className="font-medium">Para esta consulta:</span> {reminder}
                </div>
              ))}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
