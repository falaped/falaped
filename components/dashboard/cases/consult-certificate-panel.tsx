"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ActivityIcon, BedIcon, CircleCheckIcon, ClockIcon, PrinterIcon, UsersIcon, type LucideIcon } from "lucide-react"

import { generateMedicalCertificateAction } from "@/actions"
import { DocLayout, DocPaper, DocStep, emitAndOpenPdf, FromBadge, PanelFooter } from "@/components/dashboard/cases/consult-document"
import type { ConsultDoctor } from "@/components/dashboard/cases/consult-prescription-panel"
import {
  CertificateFormCard,
  getCertificatePreview,
  initialPayload,
  type WizardPayload,
} from "@/components/dashboard/medical-certificates/medical-certificate-wizard"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MedicalCertificateType } from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"

const TYPES: Array<[MedicalCertificateType, string, string, LucideIcon]> = [
  ["comparecimento", "Comparecimento", "Esteve na consulta, com horário", ClockIcon],
  ["medico", "Afastamento", "Precisa ficar em casa por uns dias", BedIcon],
  ["acompanhante", "Acompanhante", "Para o responsável apresentar no trabalho", UsersIcon],
  ["aptidao_fisica", "Aptidão física", "Liberado para esporte ou natação", ActivityIcon],
]

/** Tudo o que a consulta já sabe: criança, responsável, data e horário de hoje. */
function prefill(
  patient: { name: string; birth_date: string | null; responsible: string | null },
  startedAt: string,
): WizardPayload {
  const now = new Date()
  const today = format(now, "yyyy-MM-dd")
  const timeStart = format(new Date(startedAt), "HH:mm")
  const timeEnd = format(now, "HH:mm")
  const who = { patientName: patient.name, birthDate: patient.birth_date ?? "" }
  return {
    comparecimento: { ...initialPayload.comparecimento!, ...who, attendanceDate: today, timeStart, timeEnd },
    aptidao_fisica: { ...initialPayload.aptidao_fisica!, ...who },
    medico: { ...initialPayload.medico!, ...who, startDate: today },
    acompanhante: {
      ...initialPayload.acompanhante!,
      patientName: patient.name,
      companionName: patient.responsible?.trim() ?? "",
      consultationDate: today,
      timeStart,
      timeEnd,
    },
  }
}

/** Atestado dentro da Consulta (protótipo a7): data e horário da consulta já preenchidos, prévia ao lado. */
export function ConsultCertificatePanel({
  caseId,
  patient,
  startedAt,
  doctor,
  onDone,
}: {
  caseId: string
  patient: { id: string; name: string; birth_date: string | null; responsible: string | null }
  /** Início da consulta: vira o horário inicial do comparecimento e do acompanhante. */
  startedAt: string
  doctor: ConsultDoctor
  onDone: () => void
}) {
  const [type, setType] = useState<MedicalCertificateType>("comparecimento")
  const [payload, setPayload] = useState<WizardPayload>(() => prefill(patient, startedAt))
  const [busy, setBusy] = useState(false)
  const current = payload[type]!
  const issuedAt = format(new Date(), "yyyy-MM-dd")

  async function handleEmit() {
    setBusy(true)
    const ok = await emitAndOpenPdf(
      () =>
        generateMedicalCertificateAction({
          type,
          payload: current as unknown as Record<string, unknown>,
          issuedAt,
          patientId: patient.id,
          caseId,
        }),
      "Atestado emitido",
    )
    setBusy(false)
    if (ok) onDone()
  }

  const preview = getCertificatePreview(type, current, doctor, issuedAt, patient.responsible)

  const form = (
    <>
      <DocStep n={1} title="Que atestado?">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de atestado">
          {TYPES.map(([value, label, description, Icon]) => {
            const selected = type === value
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setType(value)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left",
                  selected ? "border-primary bg-primary-soft" : "border-border hover:bg-accent",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg",
                    selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-caption text-muted-foreground">{description}</span>
                </span>
                {selected ? <CircleCheckIcon className="size-4 shrink-0 text-primary-ink" aria-hidden /> : null}
              </button>
            )
          })}
        </div>
      </DocStep>
      <DocStep n={2} title="Confira os dados" aside={<FromBadge>data e horário desta consulta</FromBadge>}>
        <CertificateFormCard type={type} currentPayload={current} setPayload={setPayload} selectedPatient={patient} embedded />
      </DocStep>
    </>
  )

  return (
    <>
      <DocLayout
        form={form}
        preview={
          <DocPaper doctor={doctor} patient={patient} title={preview.title}>
            {preview.bodyParagraphs.map((segments, i) =>
              segments.length ? (
                <p key={i} className="text-[9px] leading-[1.7]">
                  {segments.map((seg, j) => (seg.bold ? <b key={j} className="text-neutral-900">{seg.text}</b> : <span key={j}>{seg.text}</span>))}
                </p>
              ) : null,
            )}
          </DocPaper>
        }
      />
      <PanelFooter>
        <Button className="ml-auto" onClick={handleEmit} disabled={busy}>
          <PrinterIcon data-icon="inline-start" />
          {busy ? "Emitindo…" : "Emitir e imprimir"}
        </Button>
      </PanelFooter>
    </>
  )
}
