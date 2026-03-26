import type { AssistantIntent } from "@/modules/falaped-assistant/contracts/assistant-types"
import {
  ORDER_PRIORITY,
  CONFIRMATION_REQUIRED,
} from "@/modules/falaped-assistant/pipeline/pipeline-policy"

export type TurnActionKind = AssistantIntent

export type TurnActionSource = "llm" | "rule" | "fallback"

export type TurnAction = {
  kind: TurnActionKind
  source: TurnActionSource
  originalInput: string
  commandMessage: string
  requiresConfirmation: boolean
}

export type TurnActionPlan = {
  actions: TurnAction[]
  source: TurnActionSource
}

export function actionRequiresConfirmation(kind: TurnActionKind): boolean {
  return CONFIRMATION_REQUIRED[kind] === true
}

export function orderActions(actions: TurnAction[]): TurnAction[] {
  const seen = new Set<TurnActionKind>()
  return [...actions]
    .filter((action) => {
      if (seen.has(action.kind)) return false
      seen.add(action.kind)
      return true
    })
    .sort((a, b) => ORDER_PRIORITY[a.kind] - ORDER_PRIORITY[b.kind])
}
