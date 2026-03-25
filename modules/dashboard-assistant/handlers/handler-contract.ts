import type { RouteResult } from "@/modules/dashboard-assistant/contracts/route-result"
import type { DashboardAssistantTurnContext } from "@/modules/dashboard-assistant/contracts/turn-context"

export type AssistantIntentHandler = (context: DashboardAssistantTurnContext) => Promise<RouteResult>
