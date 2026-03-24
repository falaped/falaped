"use server"

import { createClient } from "@/lib/supabase/server"
import {
  getFallbackCaseChatChips,
  shouldEnableAiChipSuggestions,
  type CaseChatChipSuggestion,
} from "@/lib/dashboard-case-chat-chips"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { listCaseMessagesByCaseId } from "@/modules/case-messages/list-case-messages-by-case-id"

export type SuggestCaseChatChipsActionResult =
  | { ok: true; chips: CaseChatChipSuggestion[] }
  | { ok: false; error: string; chips: CaseChatChipSuggestion[] }

export async function suggestCaseChatChipsAction(
  caseId: string,
): Promise<SuggestCaseChatChipsActionResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) {
    return { ok: false, error: "Sessão não encontrada.", chips: getFallbackCaseChatChips() }
  }

  try {
    const messages = await listCaseMessagesByCaseId(supabase, caseId)
    const userTurns = messages.filter((message) => message.role === "user").length

    if (!shouldEnableAiChipSuggestions(userTurns)) {
      return { ok: true, chips: getFallbackCaseChatChips() }
    }

    // MVP: mantém fallback curado e estável para previsibilidade clínica.
    return { ok: true, chips: getFallbackCaseChatChips() }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Falha ao carregar sugestões rápidas.",
      chips: getFallbackCaseChatChips(),
    }
  }
}

