"use server"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/formatters"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getProfileDefaultLocation } from "@/modules/profiles/get-profile-default-location"
import { generatePrescriptionPdf } from "@/modules/prescriptions/generate-prescription-pdf"
import { insertPrescription } from "@/modules/prescriptions/insert-prescription"
import { uploadPrescriptionPdf } from "@/modules/prescriptions/upload-prescription-pdf"
import { updatePrescriptionPdfPath } from "@/modules/prescriptions/update-prescription-pdf-path"
import type { DoctorInfo } from "@/modules/prescriptions/types"
import { generatePrescriptionSchema } from "@/lib/schemas/prescription"
import type { PrescriptionPayload } from "@/modules/prescriptions/types"

export type GeneratePrescriptionResult =
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
 * Generates the prescription PDF, saves to storage and table, returns base64 PDF and filename for download.
 */
export async function generatePrescriptionAction(params: {
  payload: unknown
  locationState?: string
  issuedAt?: string
  patientId?: string | null
  caseId?: string | null
}): Promise<GeneratePrescriptionResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }

  const parsed = generatePrescriptionSchema.safeParse({
    payload: params.payload,
    locationState: params.locationState,
    issuedAt: params.issuedAt,
  })
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors?.payload?.[0] ?? parsed.error.message
    return { ok: false, error: msg }
  }

  const locationState =
    parsed.data.locationState?.trim() || getProfileDefaultLocation(profile)
  const doctor: DoctorInfo = {
    firstName: profile.first_name ?? "",
    surname: profile.surname ?? "",
    crm: profile.crm ?? null,
  }
  const today = format(new Date(), "yyyy-MM-dd")
  let issuedAtDate = parsed.data.issuedAt
    ? new Date(parsed.data.issuedAt + "T12:00:00").toISOString().slice(0, 10)
    : today
  if (issuedAtDate > today) issuedAtDate = today
  const issuedAtFormatted = formatIssuedAt(issuedAtDate)

  try {
    const rawPayload = parsed.data.payload as PrescriptionPayload
    const payload: PrescriptionPayload = {
      ...rawPayload,
      birthDate: rawPayload.birthDate
        ? formatDate(rawPayload.birthDate)
        : undefined,
    }

    const buffer = await generatePrescriptionPdf({
      payload,
      doctor,
      locationState,
      issuedAt: issuedAtFormatted,
    })

    const prescriptionId = await insertPrescription(supabase, {
      profileId: profile.id,
      patientId: params.patientId ?? null,
      caseId: params.caseId ?? null,
      payload: parsed.data.payload as Record<string, unknown>,
      locationState,
      issuedAt: issuedAtDate,
      orientations: rawPayload.orientations?.trim() || null,
      warningSigns: rawPayload.warningSigns?.trim() || null,
      additionalNotes: rawPayload.additionalNotes?.trim() || null,
    })

    const pdfStoragePath = await uploadPrescriptionPdf(
      supabase,
      profile.id,
      prescriptionId,
      buffer,
    )

    await updatePrescriptionPdfPath(supabase, prescriptionId, pdfStoragePath)

    const pdfBase64 = buffer.toString("base64")
    const filename = `receita-${format(new Date(), "yyyy-MM-dd")}.pdf`
    return { ok: true, pdfBase64, filename }
  } catch (e) {
    console.error("[PRESCRIPTIONS] generatePrescription failed", e)
    return {
      ok: false,
      error: "Erro ao gerar receita. Tente novamente.",
    }
  }
}
