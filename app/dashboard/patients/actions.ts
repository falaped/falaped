"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createPatient } from "@/modules/patients/create-patient"
import { updatePatient } from "@/modules/patients/update-patient"
import { deletePatient } from "@/modules/patients/delete-patient"
import { findPatientByUserPhoneNameAndResponsible } from "@/modules/patients/find-patient-by-user-phone-name-responsible"
import {
  createPatientSchema,
  updatePatientSchema,
  type CreatePatientFormData,
  type UpdatePatientFormData,
} from "@/lib/schemas/patient"

export type CreatePatientResult =
  | { ok: true; patientId: string }
  | { ok: false; error: string }

export type UpdatePatientResult =
  | { ok: true }
  | { ok: false; error: string }

export type DeletePatientResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Creates a new patient for the current user. Redirects to the patient detail on success.
 */
export async function createPatientAction(
  data: CreatePatientFormData
): Promise<CreatePatientResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile)
    return { ok: false, error: "Sessão não encontrada." }

  const userPhone =
    profile.status === "paid" ? profile.phone ?? null : null
  if (!userPhone)
    return { ok: false, error: "Telefone não vinculado. Conecte o WhatsApp no perfil." }

  const parsed = createPatientSchema.safeParse(data)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return { ok: false, error: msg }
  }

  try {
    const existing = await findPatientByUserPhoneNameAndResponsible(
      supabase,
      userPhone,
      parsed.data.name,
      parsed.data.responsible
    )
    if (existing) {
      return {
        ok: false,
        error:
          "Já existe um paciente cadastrado com esse nome e responsável.",
      }
    }

    const patient = await createPatient(supabase, userPhone, {
      name: parsed.data.name,
      birth_date: parsed.data.birth_date ?? null,
      responsible: parsed.data.responsible,
      contact_phone: parsed.data.contact_phone,
      sex: parsed.data.sex ?? null,
      legal_guardian: parsed.data.legal_guardian ?? null,
      blood_type: parsed.data.blood_type ?? null,
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

/**
 * Deletes a patient. Caller must ensure the patient belongs to the current user.
 */
export async function deletePatientAction(
  id: string
): Promise<DeletePatientResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile)
    return { ok: false, error: "Sessão não encontrada." }

  const userPhone =
    profile.status === "paid" ? profile.phone ?? null : null
  if (!userPhone)
    return { ok: false, error: "Telefone não vinculado. Conecte o WhatsApp no perfil." }

  try {
    await deletePatient(supabase, id, userPhone)
    revalidatePath("/dashboard/patients")
    revalidatePath(`/dashboard/patients/${id}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao excluir paciente. Tente novamente."
    return { ok: false, error: message }
  }
}

/**
 * Updates an existing patient. Caller must ensure the patient belongs to the current user.
 */
export async function updatePatientAction(
  id: string,
  data: UpdatePatientFormData
): Promise<UpdatePatientResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile)
    return { ok: false, error: "Sessão não encontrada." }

  const userPhone =
    profile.status === "paid" ? profile.phone ?? null : null
  if (!userPhone)
    return { ok: false, error: "Telefone não vinculado. Conecte o WhatsApp no perfil." }

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

    await updatePatient(supabase, id, userPhone, payload)
    revalidatePath("/dashboard/patients")
    revalidatePath(`/dashboard/patients/${id}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao atualizar paciente. Tente novamente."
    return { ok: false, error: message }
  }
}
