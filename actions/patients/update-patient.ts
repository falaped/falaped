"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { updatePatient } from "@/modules/patients/update-patient"
import { updatePatientSchema, type UpdatePatientFormData } from "@/lib/schemas/patient"

export type UpdatePatientResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Updates an existing patient. Caller must ensure the patient belongs to the current user.
 */
export async function updatePatientAction(
  id: string,
  data: UpdatePatientFormData,
): Promise<UpdatePatientResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile)
    return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  const parsed = updatePatientSchema.safeParse(data)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return { ok: false, error: msg }
  }

  try {
    const payload: Parameters<typeof updatePatient>[3] = {}
    if (parsed.data.name !== undefined) payload.name = parsed.data.name
    if (parsed.data.birth_date !== undefined)
      payload.birth_date = parsed.data.birth_date ?? null
    if (parsed.data.responsible !== undefined)
      payload.responsible = parsed.data.responsible ?? null
    if (parsed.data.contact_phone !== undefined)
      payload.contact_phone = parsed.data.contact_phone ?? null
    if (parsed.data.sex !== undefined) payload.sex = parsed.data.sex ?? null
    if (parsed.data.legal_guardian !== undefined)
      payload.legal_guardian = parsed.data.legal_guardian ?? null
    if (parsed.data.blood_type !== undefined)
      payload.blood_type = parsed.data.blood_type ?? null
    if (parsed.data.gestational_age_weeks !== undefined)
      payload.gestational_age_weeks = parsed.data.gestational_age_weeks ?? null
    if (parsed.data.weight !== undefined)
      payload.weight = parsed.data.weight ?? null
    if (parsed.data.height !== undefined)
      payload.height = parsed.data.height ?? null
    if (parsed.data.head_circumference !== undefined)
      payload.head_circumference =
        parsed.data.head_circumference ?? null
    if (parsed.data.allergies !== undefined)
      payload.allergies = parsed.data.allergies ?? null
    if (parsed.data.current_medications !== undefined)
      payload.current_medications =
        parsed.data.current_medications ?? null
    if (parsed.data.medical_history !== undefined)
      payload.medical_history = parsed.data.medical_history ?? null

    await updatePatient(supabase, id, profile.id, payload)
    revalidatePath("/dashboard/patients")
    revalidatePath(`/dashboard/patients/${id}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao atualizar paciente. Tente novamente."
    return { ok: false, error: message }
  }
}
