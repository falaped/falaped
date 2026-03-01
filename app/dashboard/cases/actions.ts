"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { setCasePatientId } from "@/modules/cases/set-case-patient-id"
import { deleteCase } from "@/modules/cases/delete-case"
import { updateCaseStatus } from "@/modules/cases/update-case-status"

export type SetCasePatientIdResult =
  | { ok: true }
  | { ok: false; error: string }

export type DeleteCaseResult =
  | { ok: true }
  | { ok: false; error: string }

export type UpdateCaseStatusResult =
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
    return { ok: false, error: "Perfil não ativo. Conecte o WhatsApp no perfil." }

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

export async function deleteCaseAction(caseId: string): Promise<DeleteCaseResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conecte o WhatsApp no perfil." }

  try {
    await deleteCase(supabase, caseId, profile.id)
    revalidatePath("/dashboard/cases")
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao excluir caso. Tente novamente."
    return { ok: false, error: message }
  }
}

export async function updateCaseStatusAction(
  caseId: string,
  status: "active" | "closed",
): Promise<UpdateCaseStatusResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conecte o WhatsApp no perfil." }

  try {
    await updateCaseStatus(supabase, caseId, profile.id, status)
    revalidatePath("/dashboard/cases")
    revalidatePath(`/dashboard/cases/${caseId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao atualizar status do caso. Tente novamente."
    return { ok: false, error: message }
  }
}
