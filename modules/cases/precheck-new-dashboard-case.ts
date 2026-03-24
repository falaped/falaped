import type { SupabaseClient } from "@supabase/supabase-js"

type ActiveCaseRow = {
  id: string
  origin: "dashboard" | "whatsapp"
  status: "active" | "closed"
}

export type PrecheckNewDashboardCaseResult =
  | { type: "ok"; willClosePriorActiveDashboardCases: boolean }
  | { type: "whatsapp_active"; activeCaseId: string }

export async function precheckNewDashboardCase(
  supabase: SupabaseClient,
  profileId: string,
): Promise<PrecheckNewDashboardCaseResult> {
  const { data, error } = await supabase
    .from("cases")
    .select("id, origin, status")
    .eq("profile_id", profileId)
    .eq("status", "active")

  if (error) {
    throw new Error(`[CASES] Failed to precheck new dashboard case: ${error.message}`)
  }

  const activeCases = (data ?? []) as ActiveCaseRow[]
  const whatsappActive = activeCases.find((row) => row.origin === "whatsapp")
  if (whatsappActive) {
    return { type: "whatsapp_active", activeCaseId: whatsappActive.id }
  }

  const activeDashboardCasesCount = activeCases.filter(
    (row) => row.origin === "dashboard",
  ).length

  return {
    type: "ok",
    willClosePriorActiveDashboardCases: activeDashboardCasesCount > 0,
  }
}

