"use server"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/formatters"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getProfileDefaultLocation } from "@/modules/profiles/get-profile-default-location"
import { generateExamRequestPdf } from "@/modules/exam-requests/generate-exam-request-pdf"
import { insertExamRequest } from "@/modules/exam-requests/insert-exam-request"
import { uploadExamRequestPdf } from "@/modules/exam-requests/upload-exam-request-pdf"
import { updateExamRequestPdfPath } from "@/modules/exam-requests/update-exam-request-pdf-path"
import type { DoctorInfo, ExamRequestPayload } from "@/modules/exam-requests/types"
import { generateExamRequestSchema } from "@/lib/schemas/exam-request"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"

export type GenerateExamRequestResult =
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
 * Generates the exam request PDF, saves to storage and table, returns base64 PDF and filename for download.
 * Gated by the paid subscription; scoped to profile_id server-side (D-15).
 */
export async function generateExamRequestAction(params: {
  payload: unknown
  locationState?: string
  issuedAt?: string
  patientId?: string | null
  caseId?: string | null
}): Promise<GenerateExamRequestResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = generateExamRequestSchema.safeParse({
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
    const rawPayload = parsed.data.payload as ExamRequestPayload
    const payload: ExamRequestPayload = {
      ...rawPayload,
      birthDate: rawPayload.birthDate
        ? formatDate(rawPayload.birthDate)
        : undefined,
    }

    const buffer = await generateExamRequestPdf({
      payload,
      doctor,
      issuedAt: issuedAtFormatted,
      locationDisplay,
      logoBuffer,
    })

    const examRequestId = await insertExamRequest(supabase, {
      profileId: profile.id,
      patientId: params.patientId ?? null,
      caseId: params.caseId ?? null,
      payload: parsed.data.payload as Record<string, unknown>,
      locationState,
      issuedAt: issuedAtDate,
    })

    const pdfStoragePath = await uploadExamRequestPdf(
      supabase,
      profile.id,
      examRequestId,
      buffer,
    )

    await updateExamRequestPdfPath(
      supabase,
      examRequestId,
      profile.id,
      pdfStoragePath,
    )

    const pdfBase64 = buffer.toString("base64")
    const filename = `pedido-de-exames-${format(new Date(), "yyyy-MM-dd")}.pdf`
    return { ok: true, pdfBase64, filename }
  } catch (e) {
    console.error("[EXAM_REQUESTS] generateExamRequest failed", e)
    return {
      ok: false,
      error: "Erro ao gerar pedido de exames. Tente novamente.",
    }
  }
}
