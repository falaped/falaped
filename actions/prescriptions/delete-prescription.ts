"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deletePrescription } from "@/modules/prescriptions/delete-prescription"

export type DeletePrescriptionResult =
  | { ok: true }
  | { ok: false; error: string }

export async function deletePrescriptionAction(
  prescriptionId: string,
  pdfStoragePath: string | null,
): Promise<DeletePrescriptionResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }

  if (!prescriptionId || typeof prescriptionId !== "string")
    return { ok: false, error: "ID da receita inválido." }

  try {
    await deletePrescription(supabase, prescriptionId, profile.id, pdfStoragePath)
    revalidatePath("/dashboard/prescriptions")
    return { ok: true }
  } catch (e) {
    console.error("[PRESCRIPTIONS] delete failed", e)
    return {
      ok: false,
      error: "Erro ao excluir receita. Tente novamente.",
    }
  }
}
