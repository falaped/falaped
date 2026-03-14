"use server"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/formatters"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { generateMedicalCertificatePdf } from "@/modules/medical-certificates/generate-medical-certificate-pdf"
import { insertMedicalCertificate } from "@/modules/medical-certificates/insert-medical-certificate"
import { uploadMedicalCertificatePdf } from "@/modules/medical-certificates/upload-medical-certificate-pdf"
import { updateMedicalCertificatePdfPath } from "@/modules/medical-certificates/update-medical-certificate-pdf-path"
import type { DoctorInfo } from "@/modules/medical-certificates/types"
import {
  generateMedicalCertificateSchema,
  comparecimentoPayloadSchema,
  aptidaoFisicaPayloadSchema,
  medicoPayloadSchema,
  acompanhantePayloadSchema,
} from "@/lib/schemas/medical-certificate"
import type {
  ComparecimentoPayload,
  AptidaoFisicaPayload,
  MedicoPayload,
  AcompanhantePayload,
} from "@/modules/medical-certificates/types"

export type GenerateMedicalCertificateResult =
  | { ok: true; pdfBase64: string; filename: string }
  | { ok: false; error: string }

function parsePayloadByType(
  type: string,
  payload: unknown,
):
  | { ok: true; payload: ComparecimentoPayload | AptidaoFisicaPayload | MedicoPayload | AcompanhantePayload }
  | { ok: false; error: string } {
  switch (type) {
    case "comparecimento": {
      const r = comparecimentoPayloadSchema.safeParse(payload)
      if (!r.success) {
        const msg = r.error.flatten().fieldErrors?.patientName?.[0] ?? r.error.message
        return { ok: false, error: msg }
      }
      return { ok: true, payload: r.data }
    }
    case "aptidao_fisica": {
      const r = aptidaoFisicaPayloadSchema.safeParse(payload)
      if (!r.success) {
        const msg = r.error.flatten().fieldErrors?.patientName?.[0] ?? r.error.message
        return { ok: false, error: msg }
      }
      return { ok: true, payload: r.data }
    }
    case "medico": {
      const r = medicoPayloadSchema.safeParse(payload)
      if (!r.success) {
        const msg = r.error.flatten().fieldErrors?.patientName?.[0] ?? r.error.message
        return { ok: false, error: msg }
      }
      return { ok: true, payload: r.data }
    }
    case "acompanhante": {
      const r = acompanhantePayloadSchema.safeParse(payload)
      if (!r.success) {
        const msg = r.error.flatten().fieldErrors?.companionName?.[0] ?? r.error.message
        return { ok: false, error: msg }
      }
      return { ok: true, payload: r.data }
    }
    default:
      return { ok: false, error: "Tipo de atestado inválido." }
  }
}

function formatIssuedAt(issuedAt: string): string {
  try {
    const d = new Date(issuedAt)
    if (Number.isNaN(d.getTime())) return format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    return format(d, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  } catch {
    return format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  }
}

/**
 * Generates the medical certificate PDF, saves to storage and table, returns base64 PDF and filename for download.
 */
export async function generateMedicalCertificateAction(
  params: {
    type: "comparecimento" | "aptidao_fisica" | "medico" | "acompanhante"
    payload: unknown
    locationState: string
    issuedAt?: string
    patientId?: string | null
    caseId?: string | null
  },
): Promise<GenerateMedicalCertificateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }

  const parsed = generateMedicalCertificateSchema.safeParse({
    type: params.type,
    payload: params.payload,
    locationState: params.locationState,
    issuedAt: params.issuedAt,
  })
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors?.locationState?.[0] ?? parsed.error.message
    return { ok: false, error: msg }
  }

  const payloadResult = parsePayloadByType(parsed.data.type, parsed.data.payload)
  if (!payloadResult.ok) return { ok: false, error: payloadResult.error }

  const doctor: DoctorInfo = {
    firstName: profile.first_name ?? "",
    surname: profile.surname ?? "",
    crm: profile.crm ?? null,
  }
  const issuedAtFormatted = formatIssuedAt(
    parsed.data.issuedAt ?? new Date().toISOString(),
  )
  const issuedAtDate = parsed.data.issuedAt
    ? new Date(parsed.data.issuedAt).toISOString().slice(0, 10)
    : format(new Date(), "yyyy-MM-dd")

  try {
    const raw = payloadResult.payload
    const payloadWithFormattedDates = { ...raw } as typeof raw
    if ("birthDate" in payloadWithFormattedDates && payloadWithFormattedDates.birthDate)
      payloadWithFormattedDates.birthDate = formatDate(payloadWithFormattedDates.birthDate)
    if ("attendanceDate" in payloadWithFormattedDates && payloadWithFormattedDates.attendanceDate)
      (payloadWithFormattedDates as ComparecimentoPayload).attendanceDate = formatDate(
        (payloadWithFormattedDates as ComparecimentoPayload).attendanceDate,
      )
    if ("validityDate" in payloadWithFormattedDates && payloadWithFormattedDates.validityDate)
      (payloadWithFormattedDates as AptidaoFisicaPayload).validityDate = formatDate(
        (payloadWithFormattedDates as AptidaoFisicaPayload).validityDate,
      )
    if ("startDate" in payloadWithFormattedDates && payloadWithFormattedDates.startDate)
      (payloadWithFormattedDates as MedicoPayload).startDate = formatDate(
        (payloadWithFormattedDates as MedicoPayload).startDate,
      )
    if ("consultationDate" in payloadWithFormattedDates && payloadWithFormattedDates.consultationDate)
      (payloadWithFormattedDates as AcompanhantePayload).consultationDate = formatDate(
        (payloadWithFormattedDates as AcompanhantePayload).consultationDate,
      )

    const buffer = await generateMedicalCertificatePdf({
      type: parsed.data.type,
      payload: payloadWithFormattedDates,
      doctor,
      locationState: parsed.data.locationState,
      issuedAt: issuedAtFormatted,
    })

    const certificateId = await insertMedicalCertificate(supabase, {
      profileId: profile.id,
      type: parsed.data.type,
      patientId: params.patientId ?? null,
      caseId: params.caseId ?? null,
      payload: parsed.data.payload as Record<string, unknown>,
      locationState: parsed.data.locationState,
      issuedAt: issuedAtDate,
    })

    const pdfStoragePath = await uploadMedicalCertificatePdf(
      supabase,
      profile.id,
      certificateId,
      buffer,
    )

    await updateMedicalCertificatePdfPath(supabase, certificateId, pdfStoragePath)

    const pdfBase64 = buffer.toString("base64")
    const typeLabel =
      parsed.data.type === "comparecimento"
        ? "comparecimento"
        : parsed.data.type === "aptidao_fisica"
          ? "aptidao-fisica"
          : parsed.data.type === "medico"
            ? "medico"
            : "acompanhante"
    const filename = `atestado-${typeLabel}-${format(new Date(), "yyyy-MM-dd")}.pdf`
    return { ok: true, pdfBase64, filename }
  } catch (e) {
    console.error("[MEDICAL_CERTIFICATES] generateMedicalCertificate failed", e)
    return {
      ok: false,
      error: "Erro ao gerar atestado. Tente novamente.",
    }
  }
}
