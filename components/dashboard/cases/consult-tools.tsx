"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  FileCheckIcon,
  FlaskConicalIcon,
  ListChecksIcon,
  PaperclipIcon,
  PillIcon,
  RulerIcon,
  ScanTextIcon,
  SendIcon,
  type LucideIcon,
} from "lucide-react"

import { ConsultCertificatePanel } from "@/components/dashboard/cases/consult-certificate-panel"
import { PanelBody } from "@/components/dashboard/cases/consult-document"
import { ConsultExamReadingPanel } from "@/components/dashboard/cases/consult-exam-reading-panel"
import { ConsultExamRequestPanel } from "@/components/dashboard/cases/consult-exam-request-panel"
import { ConsultMeasurePanel } from "@/components/dashboard/cases/consult-measure-panel"
import { ConsultPrescriptionPanel, type ConsultDoctor } from "@/components/dashboard/cases/consult-prescription-panel"
import { ConsultScalePanel } from "@/components/dashboard/cases/consult-scale-panel"
import { ConsultReferralPanel } from "@/components/dashboard/cases/consult-referral-panel"
import { AttachmentsSection } from "@/components/dashboard/attachments/attachments-section"
import type { ExamReadingWithPages } from "@/components/dashboard/exam-readings/exam-reading-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Measurement } from "@/modules/patient-growth/types"
import type { PatientAttachment } from "@/modules/patient-attachments/types"
import type { ExamCatalogItem } from "@/modules/exam-catalog/types"
import type { ExamPanel } from "@/modules/exam-panels/types"
import type { ScaleResult } from "@/modules/patient-scales/types"
import type { PrescriptionTemplateOption } from "@/modules/prescription-templates/types"

type SheetKind = "prescription" | "certificate" | "exam-request" | "referral" | "scale" | "exam" | "measure" | "attachment"

const SHEET_TITLE: Record<SheetKind, string> = {
  prescription: "Nova receita",
  certificate: "Novo atestado",
  "exam-request": "Pedido de exame",
  referral: "Encaminhamento",
  scale: "Aplicar escala",
  exam: "Ler exame",
  measure: "Registrar medidas",
  attachment: "Anexos",
}

/** Largura de cada painel: com coluna ao lado (folha, resultado, curva) vai bem mais largo. */
const WIDE = "data-[side=right]:w-[min(1120px,92vw)] lg:data-[side=right]:w-[min(1120px,82vw)]"
const SHEET_WIDTH: Record<SheetKind, string> = {
  prescription: WIDE,
  certificate: WIDE,
  "exam-request": WIDE,
  referral: WIDE,
  scale: WIDE,
  measure: WIDE,
  exam: "data-[side=right]:w-[min(880px,92vw)]",
  attachment: "data-[side=right]:w-[min(760px,92vw)]",
}

const TOOLS: Array<[SheetKind, string, LucideIcon]> = [
  ["prescription", "Receita", PillIcon],
  ["certificate", "Atestado", FileCheckIcon],
  ["exam-request", "Pedido de exame", FlaskConicalIcon],
  ["referral", "Encaminhamento", SendIcon],
  ["scale", "Escala", ListChecksIcon],
  ["exam", "Ler exame", ScanTextIcon],
  ["measure", "Medidas", RulerIcon],
  ["attachment", "Anexo", PaperclipIcon],
]

/** O que os painéis de documento precisam além da criança. */
export type ConsultDocumentData = {
  allergies: string[]
  /** "12,4 kg · hoje"; null sem medida de peso. */
  weightLabel: string | null
  startedAt: string
  doctor: ConsultDoctor
  prescriptionTemplates: PrescriptionTemplateOption[]
  examCatalog: ExamCatalogItem[]
  examPanels: ExamPanel[]
}

/**
 * Barra de ferramentas da Consulta (protótipos a5–a9): tudo abre num painel lateral, sem
 * sair da consulta. Documento emitido fecha o painel e aparece em "Nesta consulta".
 */
export function ConsultTools({
  caseId,
  patient,
  subtitle,
  ageMonths,
  scaleResults,
  attachments,
  examReadings,
  measurements,
  documentData,
}: {
  caseId: string
  patient: {
    id: string
    name: string
    sex: string | null
    birth_date: string | null
    gestational_age_weeks: number | null
    responsible: string | null
  } | null
  /** "Helena Duarte · 2a 3m", repetido no topo de cada painel. */
  subtitle: string
  ageMonths: number | null
  scaleResults: ScaleResult[]
  attachments: PatientAttachment[]
  examReadings: ExamReadingWithPages[]
  measurements: Measurement[]
  documentData: ConsultDocumentData
}) {
  const router = useRouter()
  const [sheet, setSheet] = useState<SheetKind | null>(null)
  // O título fica enquanto o painel anima para fora.
  const [lastSheet, setLastSheet] = useState<SheetKind>("prescription")
  const open = (kind: SheetKind) => {
    setLastSheet(kind)
    setSheet(kind)
  }
  const onDone = () => {
    setSheet(null)
    router.refresh()
  }
  const title = SHEET_TITLE[sheet ?? lastSheet]

  return (
    <div className="flex shrink-0 flex-wrap gap-1 border-b border-border bg-card px-5 py-2">
      {TOOLS.map(([kind, label, Icon]) => (
        <Button
          key={kind}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          disabled={!patient}
          onClick={() => open(kind)}
        >
          <Icon data-icon="inline-start" />
          {label}
        </Button>
      ))}

      {patient ? (
        <Sheet open={sheet !== null} onOpenChange={(next) => !next && setSheet(null)}>
          <SheetContent
            className={cn("gap-0 rounded-l-2xl bg-card data-[side=right]:sm:max-w-none", SHEET_WIDTH[sheet ?? lastSheet])}
          >
            <SheetHeader className="border-b border-border px-6 py-4">
              <SheetTitle className="font-display text-section font-semibold">{title}</SheetTitle>
              <SheetDescription className="text-caption text-subtle-foreground">{subtitle}</SheetDescription>
            </SheetHeader>
            {sheet === "prescription" ? (
              <ConsultPrescriptionPanel
                caseId={caseId}
                patient={patient}
                allergies={documentData.allergies}
                weightLabel={documentData.weightLabel}
                templates={documentData.prescriptionTemplates}
                doctor={documentData.doctor}
                onDone={onDone}
              />
            ) : null}
            {sheet === "certificate" ? (
              <ConsultCertificatePanel
                caseId={caseId}
                patient={patient}
                startedAt={documentData.startedAt}
                doctor={documentData.doctor}
                onDone={onDone}
              />
            ) : null}
            {sheet === "exam-request" ? (
              <ConsultExamRequestPanel
                caseId={caseId}
                patient={patient}
                catalog={documentData.examCatalog}
                panels={documentData.examPanels}
                doctor={documentData.doctor}
                onDone={onDone}
              />
            ) : null}
            {sheet === "referral" ? <ConsultReferralPanel caseId={caseId} patient={patient} doctor={documentData.doctor} onDone={onDone} /> : null}
            {sheet === "scale" ? (
              <ConsultScalePanel patientId={patient.id} caseId={caseId} ageMonths={ageMonths} history={scaleResults} onDone={onDone} />
            ) : null}
            {sheet === "exam" ? (
              <ConsultExamReadingPanel patientId={patient.id} caseId={caseId} readings={examReadings} onDone={onDone} />
            ) : null}
            {sheet === "measure" ? (
              <ConsultMeasurePanel patient={patient} measurements={measurements} onDone={onDone} />
            ) : null}
            {sheet === "attachment" ? (
              <PanelBody>
                <AttachmentsSection
                  patientId={patient.id}
                  caseId={caseId}
                  attachments={attachments}
                  title="Anexos desta consulta"
                  description="Os arquivos ficam também na ficha da criança."
                />
              </PanelBody>
            ) : null}
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  )
}
