"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { updateCaseReport } from "@/modules/cases/update-case-report"
import type { CaseReportSection } from "@/modules/cases/get-case-report"

export type UpdateCaseReportResult =
  | { ok: true }
  | { ok: false; error: string }

export type UpdateCaseReportPayload = {
  caseId: string
  sections?: CaseReportSection[]
  isFinalized?: boolean
  finalizedAt?: string | null
}

/**
 * Updates an existing case report (reorder sections, finalize, or unfinalize).
 * Ownership is validated inside updateCaseReport (getCaseById) using profile from session.
 */
export async function updateCaseReportAction(
  payload: UpdateCaseReportPayload,
): Promise<UpdateCaseReportResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conecte o WhatsApp no perfil." }

  try {
    await updateCaseReport(supabase, {
      case_id: payload.caseId,
      profile_id: profile.id,
      sections: payload.sections,
      is_finalized: payload.isFinalized,
      finalized_at: payload.finalizedAt,
    })

    revalidatePath("/dashboard/cases")
    revalidatePath(`/dashboard/cases/${payload.caseId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao atualizar relatório. Tente novamente."
    return { ok: false, error: message }
  }
}
