"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CheckIcon, PlusIcon, PrinterIcon } from "lucide-react"

import { generateReferralAction } from "@/actions"
import { ChoiceChip, DocLayout, DocPaper, DocStep, emitAndOpenPdf, PanelFooter } from "@/components/dashboard/cases/consult-document"
import type { ConsultDoctor } from "@/components/dashboard/cases/consult-prescription-panel"
import { SPECIALTY_OPTIONS, URGENCY_OPTIONS } from "@/components/dashboard/referrals/referral-wizard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { ReferralUrgency } from "@/modules/referrals/types"

const SPECIALTIES = SPECIALTY_OPTIONS.filter((option) => option !== "Outro")

const URGENCY_HINT: Record<ReferralUrgency, { dot: string; hint: string; paper: string }> = {
  rotina: { dot: "bg-subtle-foreground", hint: "Agendar normalmente", paper: "bg-neutral-100 text-neutral-700" },
  prioritario: { dot: "bg-warning", hint: "Nas próximas semanas", paper: "bg-amber-100 text-amber-800" },
  urgente: { dot: "bg-destructive", hint: "Procurar logo", paper: "bg-red-100 text-red-800" },
}

/** Encaminhamento dentro da Consulta (protótipo a6f): para onde, com que pressa e por quê. */
export function ConsultReferralPanel({
  caseId,
  patient,
  doctor,
  onDone,
}: {
  caseId: string
  patient: { id: string; name: string; birth_date: string | null }
  doctor: ConsultDoctor
  onDone: () => void
}) {
  const [specialty, setSpecialty] = useState("")
  const [isOther, setIsOther] = useState(false)
  const [urgency, setUrgency] = useState<ReferralUrgency>("rotina")
  const [reason, setReason] = useState("")
  const [clinicalSummary, setClinicalSummary] = useState("")
  const [busy, setBusy] = useState(false)
  const ready = specialty.trim() && reason.trim()
  const urgencyLabel = URGENCY_OPTIONS.find((option) => option.value === urgency)?.label

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

  const form = (
    <>
      <DocStep n={1} title="Para qual especialidade?">
        <div className="flex flex-wrap gap-1.5">
          {SPECIALTIES.map((option) => {
            const selected = !isOther && specialty === option
            return (
              <ChoiceChip
                key={option}
                selected={selected}
                onClick={() => {
                  setIsOther(false)
                  setSpecialty(option)
                }}
              >
                {selected ? <CheckIcon className="size-3" aria-hidden /> : null}
                {option}
              </ChoiceChip>
            )
          })}
          <ChoiceChip
            selected={isOther}
            onClick={() => {
              setIsOther(true)
              setSpecialty("")
            }}
          >
            <PlusIcon className="size-3" aria-hidden />
            Outra
          </ChoiceChip>
        </div>
        {isOther ? (
          <Input autoFocus value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Especialidade ou serviço" />
        ) : null}
      </DocStep>
      <DocStep n={2} title="Com que urgência?">
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Urgência">
          {URGENCY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={urgency === value}
              onClick={() => setUrgency(value)}
              className={cn(
                "rounded-xl border p-3 text-left",
                urgency === value ? "border-primary bg-primary-soft" : "border-border hover:bg-accent",
              )}
            >
              <span className="flex items-center gap-2 font-semibold">
                <span className={cn("size-2 rounded-full", URGENCY_HINT[value].dot)} aria-hidden />
                {label}
              </span>
              <span className="block text-caption text-muted-foreground">{URGENCY_HINT[value].hint}</span>
            </button>
          ))}
        </div>
      </DocStep>
      <DocStep n={3} title="Motivo">
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Por que está encaminhando" />
        <label className="flex flex-col gap-1.5">
          <span className="text-label font-medium">
            Resumo clínico <span className="font-normal text-subtle-foreground">(opcional)</span>
          </span>
          <Textarea value={clinicalSummary} onChange={(e) => setClinicalSummary(e.target.value)} rows={3} />
        </label>
      </DocStep>
    </>
  )

  const preview = (
    <DocPaper doctor={doctor} patient={patient} title="Encaminhamento">
      <div>
        Ao serviço de <b className="text-neutral-900">{specialty.trim() || "…"}</b>
      </div>
      <div>
        <span className={cn("rounded-sm px-1 font-semibold", URGENCY_HINT[urgency].paper)}>{urgencyLabel}</span>
      </div>
      <p className="pt-1 text-[9px] leading-[1.7] whitespace-pre-line">
        Encaminho para avaliação.{" "}
        {reason.trim() ? (
          <>
            <b className="text-neutral-900">Motivo:</b> {reason.trim()}
          </>
        ) : null}
      </p>
      {clinicalSummary.trim() ? (
        <p className="text-[9px] leading-[1.7] whitespace-pre-line">
          <b className="text-neutral-900">Resumo clínico:</b> {clinicalSummary.trim()}
        </p>
      ) : null}
      <p className="text-[9px]">Agradeço a atenção.</p>
    </DocPaper>
  )

  return (
    <>
      <DocLayout form={form} preview={preview} />
      <PanelFooter>
        <Button className="ml-auto" onClick={handleEmit} disabled={busy || !ready}>
          <PrinterIcon data-icon="inline-start" />
          {busy ? "Emitindo…" : "Emitir e imprimir"}
        </Button>
      </PanelFooter>
    </>
  )
}
