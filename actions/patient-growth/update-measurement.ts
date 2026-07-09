"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  updateMeasurementSchema,
  type UpdateMeasurementFormData,
} from "@/lib/schemas/patient-measurement"
import { updateMeasurement } from "@/modules/patient-growth/update-measurement"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type UpdateMeasurementResult =
  | { ok: true; measurementId: string }
  | { ok: false; error: string }

/** kg -> g (integer). Returns null when the value is absent. */
function kgToGrams(kg: number | undefined): number | null {
  return kg === undefined ? null : Math.round(kg * 1000)
}

/** cm -> mm (integer). Returns null when the value is absent. */
function cmToMm(cm: number | undefined): number | null {
  return cm === undefined ? null : Math.round(cm * 10)
}

/**
 * Updates an anthropometric measurement of a patient owned by the current user.
 * Gated by the paid subscription; scoped to id + profile_id + patient_id
 * server-side (IDOR backstop — D-14).
 */
export async function updateMeasurementAction(
  data: UpdateMeasurementFormData,
): Promise<UpdateMeasurementResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile)
    return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  const parsed = updateMeasurementSchema.safeParse(data)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return { ok: false, error: msg }
  }

  try {
    const measurement = await updateMeasurement(
      supabase,
      parsed.data.id,
      profile.id,
      parsed.data.patientId,
      {
        measured_on: parsed.data.measured_on,
        weight_grams: kgToGrams(parsed.data.weight),
        length_height_mm: cmToMm(parsed.data.length_height),
        head_circumference_mm: cmToMm(parsed.data.head_circumference),
      },
    )
    revalidatePath(`/dashboard/patients/${parsed.data.patientId}`)
    return { ok: true, measurementId: measurement.id }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao salvar medição. Tente novamente."
    return { ok: false, error: message }
  }
}
