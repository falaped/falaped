"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deletePatient } from "@/modules/patients/delete-patient"

export type DeletePatientResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Deletes a patient. Caller must ensure the patient belongs to the current user.
 */
export async function deletePatientAction(
  id: string,
): Promise<DeletePatientResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile)
    return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conecte o WhatsApp no perfil." }

  try {
    await deletePatient(supabase, id, profile.id)
    revalidatePath("/dashboard/patients")
    revalidatePath(`/dashboard/patients/${id}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao excluir paciente. Tente novamente."
    return { ok: false, error: message }
  }
}
