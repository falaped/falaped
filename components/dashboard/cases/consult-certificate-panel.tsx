"use client"

import { useState } from "react"
import { format } from "date-fns"
import { PrinterIcon } from "lucide-react"

import { generateMedicalCertificateAction } from "@/actions"
import { emitAndOpenPdf, PanelBody, PanelFooter } from "@/components/dashboard/cases/consult-document"
import type { ConsultDoctor } from "@/components/dashboard/cases/consult-prescription-panel"
import {
  CertificateFormCard,
  CertificatePreviewShort,
  initialPayload,
  type WizardPayload,
} from "@/components/dashboard/medical-certificates/medical-certificate-wizard"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MedicalCertificateType } from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"

const TYPES: Array<[MedicalCertificateType, string]> = [
  ["comparecimento", "Comparecimento"],
  ["medico", "Afastamento"],
  ["acompanhante", "Acompanhante"],
  ["aptidao_fisica", "Aptidão física"],
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

  return (
    <>
      <PanelBody>
        <div className="flex flex-col gap-1.5">
          <span className="text-label font-medium">Tipo</span>
          <div className="inline-flex w-fit rounded-lg bg-muted p-1" role="group" aria-label="Tipo de atestado">
            {TYPES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={type === value}
                onClick={() => setType(value)}
                className={cn(
                  "h-8 rounded-md px-3 text-label",
                  type === value ? "bg-card font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <CertificateFormCard
          type={type}
          currentPayload={current}
          setPayload={setPayload}
          selectedPatient={patient}
          embedded
        />
        <div className="flex flex-col gap-2">
          <span className="text-caption font-medium text-subtle-foreground">
            Prévia
          </span>
          <CertificatePreviewShort
            type={type}
            currentPayload={current}
            profile={doctor}
            issuedAt={issuedAt}
            selectedPatient={patient}
            embedded
          />
        </div>
      </PanelBody>
      <PanelFooter>
        <Button className="ml-auto" onClick={handleEmit} disabled={busy}>
          <PrinterIcon data-icon="inline-start" />
          {busy ? "Emitindo…" : "Emitir e imprimir"}
        </Button>
      </PanelFooter>
    </>
  )
}
