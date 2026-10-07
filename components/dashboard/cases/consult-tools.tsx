"use client"

import { useState } from "react"
import Link from "next/link"
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

import { AttachmentsSection } from "@/components/dashboard/attachments/attachments-section"
import { ExamReadingsSection } from "@/components/dashboard/exam-readings/exam-readings-section"
import type { ExamReadingWithPages } from "@/components/dashboard/exam-readings/exam-reading-card"
import { MeasurementForm } from "@/components/dashboard/patients/growth/measurement-form"
import { ScalesSection } from "@/components/dashboard/scales/scales-section"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { PatientAttachment } from "@/modules/patient-attachments/types"
import type { ScaleResult } from "@/modules/patient-scales/types"

type SheetKind = "scale" | "exam" | "measure" | "attachment"

const SHEET_TITLE: Record<SheetKind, string> = {
  scale: "Aplicar escala",
  exam: "Ler exame",
  measure: "Registrar medidas",
  attachment: "Anexos",
}

/**
 * Barra de ferramentas da Consulta (protótipo a5). Escala, Ler exame, Anexo e Medidas abrem
 * aqui mesmo, num painel lateral; os documentos ainda abrem o assistente de cada um e voltam para a consulta.
 * ponytail: Receita e Atestado viram painel lateral nos PRs a6/a7.
 */
export function ConsultTools({
  caseId,
  patient,
  subtitle,
  ageMonths,
  scaleResults,
  attachments,
  examReadings,
}: {
  caseId: string
  patient: { id: string; sex: string | null; birth_date: string | null } | null
  /** "Helena Duarte · 2a 3m", repetido no topo de cada painel. */
  subtitle: string
  ageMonths: number | null
  scaleResults: ScaleResult[]
  attachments: PatientAttachment[]
  examReadings: ExamReadingWithPages[]
}) {
  const [sheet, setSheet] = useState<SheetKind | null>(null)

  const query = patient ? new URLSearchParams({ caseId, patientId: patient.id }).toString() : ""
  const links: Array<[string, LucideIcon, string]> = [
    ["Receita", PillIcon, `/dashboard/prescriptions/new?${query}`],
    ["Atestado", FileCheckIcon, `/dashboard/medical-certificates/new?${query}`],
    ["Pedido de exame", FlaskConicalIcon, `/dashboard/exam-requests/new?${query}`],
    ["Encaminhamento", SendIcon, `/dashboard/referrals/new?${query}`],
  ]
  const panels: Array<[string, LucideIcon, () => void]> = [
    ["Escala", ListChecksIcon, () => setSheet("scale")],
    ["Ler exame", ScanTextIcon, () => setSheet("exam")],
    ["Medidas", RulerIcon, () => setSheet("measure")],
    ["Anexo", PaperclipIcon, () => setSheet("attachment")],
  ]
  const toolClass = "text-muted-foreground hover:text-foreground"

  return (
    <div className="flex shrink-0 flex-wrap gap-1 border-b border-border bg-card px-5 py-2">
      {links.map(([label, Icon, href]) =>
        patient ? (
          <Button key={label} asChild variant="ghost" size="sm" className={toolClass}>
            <Link href={href}>
              <Icon data-icon="inline-start" />
              {label}
            </Link>
          </Button>
        ) : (
          <Button key={label} variant="ghost" size="sm" className={toolClass} disabled>
            <Icon data-icon="inline-start" />
            {label}
          </Button>
        ),
      )}
      {panels.map(([label, Icon, onClick]) => (
        <Button key={label} variant="ghost" size="sm" className={toolClass} disabled={!patient} onClick={onClick}>
          <Icon data-icon="inline-start" />
          {label}
        </Button>
      ))}

      {patient ? (
          <Sheet open={sheet !== null} onOpenChange={(open) => !open && setSheet(null)}>
            <SheetContent className="w-[640px] gap-0 rounded-l-2xl bg-card sm:max-w-[640px]">
              <SheetHeader className="border-b border-border px-6 py-4">
                <SheetTitle className="font-display text-section font-semibold">{sheet ? SHEET_TITLE[sheet] : ""}</SheetTitle>
                <SheetDescription className="text-caption text-subtle-foreground">{subtitle}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-auto px-6 py-5">
                {sheet === "scale" ? (
                  <ScalesSection
                    patientId={patient.id}
                    caseId={caseId}
                    ageMonths={ageMonths}
                    results={scaleResults}
                    title="Escalas desta consulta"
                    description="O registro fica também no histórico da criança."
                  />
                ) : null}
                {sheet === "exam" ? (
                  <ExamReadingsSection patientId={patient.id} caseId={caseId} readings={examReadings} />
                ) : null}
                {sheet === "measure" ? (
                  <MeasurementForm
                    patientId={patient.id}
                    patientSex={patient.sex}
                    patientBirthDate={patient.birth_date}
                    open
                    onOpenChange={(open) => !open && setSheet(null)}
                  />
                ) : null}
                {sheet === "attachment" ? (
                  <AttachmentsSection
                    patientId={patient.id}
                    caseId={caseId}
                    attachments={attachments}
                    title="Anexos desta consulta"
                    description="Os arquivos ficam também na ficha da criança."
                  />
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
      ) : null}
    </div>
  )
}
