"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { deletePatientPhoto } from "@/modules/patients/delete-patient-photo"
import { updatePatientPhoto } from "@/modules/patients/update-patient-photo"

export type RemovePatientPhotoResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Remove a foto do paciente com porta de autenticação + assinatura paga +
 * escopo de dono (T-02-11). Lê o paciente escopado por `profile.id`
 * (`getPatientById` retorna null quando não é do dono), remove o objeto do
 * storage (idempotente) e zera a referência: `photo_path`/`consent_given`/
 * `consent_at` (critério de sucesso 3 — remove objeto E referência). Operação
 * destrutiva, confirmada por AlertDialog no client.
 */
export async function removePatientPhotoAction(
  patientId: string,
): Promise<RemovePatientPhotoResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  try {
    const patient = await getPatientById(supabase, patientId, profile.id)
    if (!patient) return { ok: false, error: "Paciente não encontrado." }

    await deletePatientPhoto(supabase, patient.photo_path)
    await updatePatientPhoto(supabase, patientId, profile.id, {
      photo_path: null,
      consent_given: false,
      consent_at: null,
    })

    revalidatePath("/dashboard/patients")
    revalidatePath(`/dashboard/patients/${patientId}`)
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Não foi possível remover a foto. Tente novamente.",
    }
  }
}
