"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { setCasePatientId } from "@/modules/cases/set-case-patient-id"

export type SetCasePatientIdResult =
  | { ok: true }
  | { ok: false; error: string }

export async function setCasePatientIdAction(
  caseId: string,
  patientId: string,
): Promise<SetCasePatientIdResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  try {
    await setCasePatientId(supabase, caseId, profile.id, patientId)
    revalidatePath("/dashboard/cases")
    revalidatePath(`/dashboard/cases/${caseId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao associar paciente. Tente novamente."
    return { ok: false, error: message }
  }
}
