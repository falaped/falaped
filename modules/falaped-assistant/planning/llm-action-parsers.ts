import { isPipelineStepKind } from "@/modules/falaped-assistant/contracts/turn-queue"
import type { TurnActionKind } from "@/modules/falaped-assistant/planning/turn-action-types"

export function cleanupRawContent(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
}

export function parseActionsFromPayload(payload: unknown): TurnActionKind[] {
  if (!payload || typeof payload !== "object") return []
  const raw = payload as { actions?: unknown }
  if (!Array.isArray(raw.actions)) return []
  return raw.actions
    .map((item) => (typeof item === "string" ? item : ""))
    .filter((item): item is TurnActionKind => isPipelineStepKind(item))
}
