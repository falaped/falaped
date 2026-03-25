import type { DashboardAssistantTurnContext } from "@/modules/dashboard-assistant/contracts/turn-context"
import type { RouteResult } from "@/modules/dashboard-assistant/contracts/route-result"
import { executeLegacyIntent } from "@/modules/dashboard-assistant/handlers/legacy-intent-executor"

export async function runIntentAi(
  context: DashboardAssistantTurnContext,
  commandMessage: string,
): Promise<RouteResult> {
  return executeLegacyIntent(context, commandMessage)
}
