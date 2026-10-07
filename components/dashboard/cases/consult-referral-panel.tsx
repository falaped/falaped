"use client"

import { useState } from "react"
import { format } from "date-fns"
import { PrinterIcon } from "lucide-react"

import { generateReferralAction } from "@/actions"
import { emitAndOpenPdf, PanelBody, PanelFooter } from "@/components/dashboard/cases/consult-document"
import { SPECIALTY_OPTIONS, URGENCY_OPTIONS } from "@/components/dashboard/referrals/referral-wizard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { ReferralUrgency } from "@/modules/referrals/types"

/** Encaminhamento dentro da Consulta: destino, urgência e motivo, sem escolher a criança. */
export function ConsultReferralPanel({
  caseId,
  patient,
  onDone,
}: {
  caseId: string
  patient: { id: string; name: string; birth_date: string | null }
  onDone: () => void
}) {
  const [specialty, setSpecialty] = useState("")
  const [urgency, setUrgency] = useState<ReferralUrgency>("rotina")
  const [reason, setReason] = useState("")
  const [clinicalSummary, setClinicalSummary] = useState("")
  const [busy, setBusy] = useState(false)
  const ready = specialty.trim() && reason.trim()

  async function handleEmit() {
    setBusy(true)
    const ok = await emitAndOpenPdf(
      () =>
        generateReferralAction({
          payload: {
            patientName: patient.name,
            birthDate: patient.birth_date ?? undefined,
            specialty: specialty.trim(),
            reason: reason.trim(),
            clinicalSummary: clinicalSummary.trim() || undefined,
            urgency,
          },
          issuedAt: format(new Date(), "yyyy-MM-dd"),
          patientId: patient.id,
          caseId,
        }),
      "Encaminhamento emitido",
    )
    setBusy(false)
    if (ok) onDone()
  }

  return (
    <>
      <PanelBody>
        <label className="flex flex-col gap-1.5">
          <span className="text-label font-medium">Especialidade ou serviço</span>
          <Input list="consult-referral-specialties" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ex.: Otorrinolaringologia" />
          <datalist id="consult-referral-specialties">
            {SPECIALTY_OPTIONS.filter((option) => option !== "Outro").map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-label font-medium">Urgência</span>
          <div className="inline-flex w-fit rounded-lg bg-muted p-1" role="group" aria-label="Urgência">
            {URGENCY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={urgency === value}
                onClick={() => setUrgency(value)}
                className={cn(
                  "h-8 rounded-md px-3 text-label",
                  urgency === value ? "bg-card font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-label font-medium">Motivo</span>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Por que está encaminhando" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label font-medium">
            Resumo clínico ou hipótese <span className="font-normal text-subtle-foreground">(opcional)</span>
          </span>
          <Textarea value={clinicalSummary} onChange={(e) => setClinicalSummary(e.target.value)} rows={4} />
        </label>
      </PanelBody>
      <PanelFooter>
        <Button className="ml-auto" onClick={handleEmit} disabled={busy || !ready}>
          <PrinterIcon data-icon="inline-start" />
          {busy ? "Emitindo…" : "Emitir e imprimir"}
        </Button>
      </PanelFooter>
    </>
  )
}
