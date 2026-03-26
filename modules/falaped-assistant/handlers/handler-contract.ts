import type { RouteResult } from "@/modules/falaped-assistant/contracts/route-result"
import type { AssistantTurnContext } from "@/modules/falaped-assistant/contracts/turn-context"

export type AssistantIntentHandler = (context: AssistantTurnContext) => Promise<RouteResult>
