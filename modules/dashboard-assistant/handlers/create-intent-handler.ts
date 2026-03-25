import type { DashboardAssistantIntent } from "@/modules/dashboard-assistant/contracts/assistant-types"
import type { AssistantIntentHandler } from "@/modules/dashboard-assistant/handlers/handler-contract"
import { buildIntentCommand } from "@/modules/dashboard-assistant/handlers/business/build-intent-command"
import { runIntentAi } from "@/modules/dashboard-assistant/handlers/ai/run-intent-ai"

export function createIntentHandler(intent: DashboardAssistantIntent): AssistantIntentHandler {
  return async (context) => {
    const command = buildIntentCommand(intent, context)
    return runIntentAi(context, command)
  }
}
