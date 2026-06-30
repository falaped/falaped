"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createPatient } from "@/modules/patients/create-patient"
import { findPatientByProfileIdNameAndResponsible } from "@/modules/patients/find-patient-by-profile-id-name-responsible"
import { createPatientSchema, type CreatePatientFormData } from "@/lib/schemas/patient"

export type CreatePatientResult =
  | { ok: true; patientId: string }
  | { ok: false; error: string }

/**
 * Creates a new patient for the current user.
 */
export async function createPatientAction(
  data: CreatePatientFormData,
): Promise<CreatePatientResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile)
    return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  const parsed = createPatientSchema.safeParse(data)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return { ok: false, error: msg }
  }

  try {
    const existing = await findPatientByProfileIdNameAndResponsible(
      supabase,
      profile.id,
      parsed.data.name,
      parsed.data.responsible,
    )
    if (existing) {
      return {
        ok: false,
        error:
          "Já existe um paciente cadastrado com esse nome e responsável.",
      }
    }

    const patient = await createPatient(supabase, profile.id, {
      name: parsed.data.name,
      birth_date: parsed.data.birth_date ?? null,
      responsible: parsed.data.responsible,
      contact_phone: parsed.data.contact_phone,
      sex: parsed.data.sex ?? null,
      legal_guardian: parsed.data.legal_guardian ?? null,
      blood_type: parsed.data.blood_type ?? null,
      gestational_age_weeks: parsed.data.gestational_age_weeks ?? null,
      weight: parsed.data.weight ?? null,
      height: parsed.data.height ?? null,
      head_circumference: parsed.data.head_circumference ?? null,
      allergies: parsed.data.allergies ?? null,
      current_medications: parsed.data.current_medications ?? null,
      medical_history: parsed.data.medical_history ?? null,
    })
    revalidatePath("/dashboard/patients")
    return { ok: true, patientId: patient.id }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao cadastrar paciente. Tente novamente."
    return { ok: false, error: message }
  }
}
