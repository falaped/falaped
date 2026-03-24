"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createDashboardCaseWithPatient } from "@/modules/cases/create-dashboard-case-with-patient"
import { insertCaseMessage } from "@/modules/case-messages/insert-case-message"
import { DASHBOARD_NEW_CASE_GREETING } from "@/lib/constants"

export type CreateDashboardCaseWithPatientActionResult =
  | { ok: true; caseId: string }
  | { ok: false; code: "not_authenticated" | "unpaid" | "no_phone" | "whatsapp_active" | "unknown"; error: string; activeCaseId?: string }

export async function createDashboardCaseWithPatientAction(
  patientId: string,
): Promise<CreateDashboardCaseWithPatientActionResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)

  if (!profile?.id) {
    return { ok: false, code: "not_authenticated", error: "Sessão não encontrada." }
  }

  if (profile.status !== "paid") {
    return {
      ok: false,
      code: "unpaid",
      error: "Perfil não ativo. Conecte seu WhatsApp para abrir um novo caso.",
    }
  }

  if (!profile.phone?.trim()) {
    return {
      ok: false,
      code: "no_phone",
      error: "Telefone profissional não encontrado no perfil.",
    }
  }

  try {
    const result = await createDashboardCaseWithPatient(
      supabase,
      profile.id,
      profile.phone,
      patientId,
    )

    if (result.type === "whatsapp_active") {
      return {
        ok: false,
        code: "whatsapp_active",
        error: "Existe um caso ativo do WhatsApp. Abra esse caso para continuar.",
        activeCaseId: result.activeCaseId,
      }
    }

    await insertCaseMessage(supabase, {
      caseId: result.caseId,
      role: "assistant",
      content: DASHBOARD_NEW_CASE_GREETING,
    })

    revalidatePath("/dashboard/cases")
    revalidatePath(`/dashboard/cases/new/${result.caseId}`)

    return { ok: true, caseId: result.caseId }
  } catch (error) {
    return {
      ok: false,
      code: "unknown",
      error: error instanceof Error ? error.message : "Erro ao abrir novo caso.",
    }
  }
}

