"use server"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/formatters"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getProfileDefaultLocation } from "@/modules/profiles/get-profile-default-location"
import { generateMedicalReportPdf } from "@/modules/medical-reports/generate-medical-report-pdf"
import { insertMedicalReport } from "@/modules/medical-reports/insert-medical-report"
import { uploadMedicalReportPdf } from "@/modules/medical-reports/upload-medical-report-pdf"
import { updateMedicalReportPdfPath } from "@/modules/medical-reports/update-medical-report-pdf-path"
import type { DoctorInfo, MedicalReportPayload } from "@/modules/medical-reports/types"
import { generateMedicalReportSchema } from "@/lib/schemas/medical-report"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"

export type GenerateMedicalReportResult =
  | { ok: true; pdfBase64: string; filename: string }
  | { ok: false; error: string }

function formatIssuedAt(issuedAt: string): string {
  try {
    const d = new Date(issuedAt + "T12:00:00")
    if (Number.isNaN(d.getTime()))
      return format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    return format(d, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  } catch {
    return format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  }
}

/**
 * Generates the medical report PDF, saves to storage and table, returns base64 PDF and filename for download.
 * Gated by the paid subscription; scoped to profile_id server-side (D-15).
 */
export async function generateMedicalReportAction(params: {
  payload: unknown
  locationState?: string
  issuedAt?: string
  patientId?: string | null
  caseId?: string | null
}): Promise<GenerateMedicalReportResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = generateMedicalReportSchema.safeParse({
    payload: params.payload,
    locationState: params.locationState,
    issuedAt: params.issuedAt,
  })
  if (!parsed.success) {
    return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  }

  const locationState =
    parsed.data.locationState?.trim() || getProfileDefaultLocation(profile)
  const doctor: DoctorInfo = {
    firstName: profile.first_name ?? "",
    surname: profile.surname ?? "",
    crm: profile.crm ?? null,
    rqe: profile.rqe ?? null,
  }
  const locationDisplay =
    profile.default_location_city?.trim() &&
    profile.default_location_state?.trim()
      ? `${profile.default_location_city.trim()} - ${profile.default_location_state.trim()}`
      : profile.default_location_state?.trim() ?? "—"
  let logoBuffer: Buffer | null = null
  if (profile.logo_url_full?.trim()) {
    try {
      const res = await fetch(profile.logo_url_full.trim())
      if (res.ok) {
        const ab = await res.arrayBuffer()
        logoBuffer = Buffer.from(ab)
      }
    } catch {
      // omit logo on fetch error
    }
  }
  const today = format(new Date(), "yyyy-MM-dd")
  let issuedAtDate = parsed.data.issuedAt
    ? new Date(parsed.data.issuedAt + "T12:00:00").toISOString().slice(0, 10)
    : today
  if (issuedAtDate > today) issuedAtDate = today
  const issuedAtFormatted = formatIssuedAt(issuedAtDate)

  try {
    const rawPayload = parsed.data.payload as MedicalReportPayload
    const payload: MedicalReportPayload = {
      ...rawPayload,
      birthDate: rawPayload.birthDate
        ? formatDate(rawPayload.birthDate)
        : undefined,
    }

    const buffer = await generateMedicalReportPdf({
      payload,
      doctor,
      issuedAt: issuedAtFormatted,
      locationDisplay,
      logoBuffer,
    })

    const medicalReportId = await insertMedicalReport(supabase, {
      profileId: profile.id,
      patientId: params.patientId ?? null,
      caseId: params.caseId ?? null,
      payload: parsed.data.payload as Record<string, unknown>,
      locationState,
      issuedAt: issuedAtDate,
    })

    const pdfStoragePath = await uploadMedicalReportPdf(
      supabase,
      profile.id,
      medicalReportId,
      buffer,
    )

    await updateMedicalReportPdfPath(
      supabase,
      medicalReportId,
      profile.id,
      pdfStoragePath,
    )

    const pdfBase64 = buffer.toString("base64")
    const filename = `relatorio-${format(new Date(), "yyyy-MM-dd")}.pdf`
    return { ok: true, pdfBase64, filename }
  } catch (e) {
    console.error("[MEDICAL_REPORTS] generateMedicalReport failed", e)
    return {
      ok: false,
      error: "Erro ao gerar relatório. Tente novamente.",
    }
  }
}
