"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  deleteScaleResultSchema,
  type DeleteScaleResultFormData,
} from "@/lib/schemas/patient-scale-result"
import { deleteScaleResult } from "@/modules/patient-scales/delete-scale-result"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type DeleteScaleResultResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Apaga uma aplicação de escala do médico logado. A posse é garantida pelo
 * filtro `profile_id` no módulo: id alheio não apaga nada e não vaza existência.
 */
export async function deleteScaleResultAction(
  data: DeleteScaleResultFormData,
): Promise<DeleteScaleResultResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = deleteScaleResultSchema.safeParse(data)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return { ok: false, error: msg }
  }

  try {
    await deleteScaleResult(supabase, profile.id, parsed.data.id)
    revalidatePath(`/dashboard/patients/${parsed.data.patientId}`)
    if (parsed.data.caseId)
      revalidatePath(`/dashboard/cases/${parsed.data.caseId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao apagar a escala. Tente novamente."
    return { ok: false, error: message }
  }
}
