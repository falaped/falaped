"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { deleteMeasurement } from "@/modules/patient-growth/delete-measurement"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type DeleteMeasurementResult =
  | { ok: true }
  | { ok: false; error: string }

const deleteMeasurementSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
})

/**
 * Deletes a measurement of a patient owned by the current user. Gated by the
 * paid subscription; scoped to id + profile_id + patient_id server-side (IDOR
 * backstop — D-14, never id alone).
 */
export async function deleteMeasurementAction(input: {
  id: string
  patientId: string
}): Promise<DeleteMeasurementResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile)
    return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  const parsed = deleteMeasurementSchema.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return { ok: false, error: msg }
  }

  try {
    await deleteMeasurement(
      supabase,
      parsed.data.id,
      profile.id,
      parsed.data.patientId,
    )
    revalidatePath(`/dashboard/patients/${parsed.data.patientId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao remover medição. Tente novamente."
    return { ok: false, error: message }
  }
}
