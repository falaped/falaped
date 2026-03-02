"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteCaseReport } from "@/modules/cases/delete-case-report"

export type DeleteCaseReportResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Deletes the case report for a case. Ownership is validated inside
 * deleteCaseReport (getCaseById) using profile from session.
 */
export async function deleteCaseReportAction(
  caseId: string,
): Promise<DeleteCaseReportResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conecte o WhatsApp no perfil." }

  try {
    await deleteCaseReport(supabase, caseId, profile.id)
    revalidatePath("/dashboard/cases")
    revalidatePath(`/dashboard/cases/${caseId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao excluir relatório. Tente novamente."
    return { ok: false, error: message }
  }
}
