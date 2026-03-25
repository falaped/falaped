import type { DashboardAssistantIntent } from "@/modules/dashboard-assistant/contracts/assistant-types"
import type { DashboardAssistantTurnContext } from "@/modules/dashboard-assistant/contracts/turn-context"
import type { RouteResult } from "@/modules/dashboard-assistant/contracts/route-result"
import { routeDashboardCaseAssistantTurn } from "@/modules/dashboard-assistant/route-case-assistant-turn"

export async function executeLegacyIntent(
  context: DashboardAssistantTurnContext,
  userMessageOverride?: string,
  dispatchedIntent?: DashboardAssistantIntent,
): Promise<RouteResult> {
  return routeDashboardCaseAssistantTurn({
    userMessage: userMessageOverride ?? context.userMessage,
    messages: context.messages,
    pendingAction: context.pendingAction,
    patientContext: context.patientContext,
    conversationSummary: context.conversationSummary,
    patientMetrics: context.patientMetrics,
    patientProfile: context.patientProfile,
    pipelineIntent: dispatchedIntent ?? null,
  })
}
