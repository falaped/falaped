"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { precheckNewDashboardCase } from "@/modules/cases/precheck-new-dashboard-case"

export type PrecheckNewDashboardCaseActionResult =
  | { ok: true; willClosePriorActiveDashboardCases: boolean }
  | { ok: false; code: "not_authenticated" | "unpaid" | "whatsapp_active" | "unknown"; error: string; activeCaseId?: string }

export async function precheckNewDashboardCaseAction(): Promise<PrecheckNewDashboardCaseActionResult> {
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

  try {
    const result = await precheckNewDashboardCase(supabase, profile.id)
    if (result.type === "whatsapp_active") {
      return {
        ok: false,
        code: "whatsapp_active",
        error: "Existe um caso ativo do WhatsApp. Finalize ou abra esse caso para continuar.",
        activeCaseId: result.activeCaseId,
      }
    }

    return {
      ok: true,
      willClosePriorActiveDashboardCases: result.willClosePriorActiveDashboardCases,
    }
  } catch (error) {
    return {
      ok: false,
      code: "unknown",
      error: error instanceof Error ? error.message : "Erro ao validar novo caso.",
    }
  }
}

