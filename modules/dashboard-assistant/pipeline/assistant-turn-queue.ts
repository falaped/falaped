import type {
  AssistantQueueSource,
  AssistantTurnQueue,
  PipelineStep,
} from "@/modules/dashboard-assistant/contracts/turn-queue"
import { isPipelineStepKind } from "@/modules/dashboard-assistant/contracts/turn-queue"
import { orderPipelineSteps, requiresConfirmationForStep } from "@/modules/dashboard-assistant/pipeline/pipeline-policy"

function nowIso(): string {
  return new Date().toISOString()
}

export function parseAssistantTurnQueue(value: unknown): AssistantTurnQueue | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  if (raw.version !== 1) return null
  if (!Array.isArray(raw.steps)) return null
  if (typeof raw.cursor !== "number") return null

  const steps: PipelineStep[] = []
  for (const step of raw.steps) {
    if (!step || typeof step !== "object") return null
    const rawStep = step as Record<string, unknown>
    if (typeof rawStep.id !== "string") return null
    if (typeof rawStep.kind !== "string" || !isPipelineStepKind(rawStep.kind)) return null
    if (typeof rawStep.originalInput !== "string") return null
    if (typeof rawStep.commandMessage !== "string") return null
    steps.push({
      id: rawStep.id,
      kind: rawStep.kind,
      originalInput: rawStep.originalInput,
      commandMessage: rawStep.commandMessage,
      requiresConfirmation:
        typeof rawStep.requiresConfirmation === "boolean"
          ? rawStep.requiresConfirmation
          : requiresConfirmationForStep(rawStep.kind),
      meta:
        rawStep.meta && typeof rawStep.meta === "object"
          ? (rawStep.meta as Record<string, string | number | boolean | null>)
          : undefined,
    })
  }

  return {
    version: 1,
    source: (raw.source as AssistantQueueSource) ?? "heuristic",
    cursor: raw.cursor,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : nowIso(),
    sourceMessageId: typeof raw.sourceMessageId === "string" ? raw.sourceMessageId : null,
    blockedAssistantMessageId:
      typeof raw.blockedAssistantMessageId === "string" ? raw.blockedAssistantMessageId : null,
    steps,
  }
}

export function buildAssistantTurnQueue(params: {
  source: AssistantQueueSource
  sourceMessageId?: string | null
  steps: PipelineStep[]
}): AssistantTurnQueue | null {
  const ordered = orderPipelineSteps(params.steps)
  if (ordered.length <= 1) return null
  const now = nowIso()
  return {
    version: 1,
    source: params.source,
    cursor: 0,
    createdAt: now,
    updatedAt: now,
    sourceMessageId: params.sourceMessageId ?? null,
    blockedAssistantMessageId: null,
    steps: ordered,
  }
}

export function getCurrentQueueStep(queue: AssistantTurnQueue | null): PipelineStep | null {
  if (!queue) return null
  if (queue.cursor < 0 || queue.cursor >= queue.steps.length) return null
  return queue.steps[queue.cursor] ?? null
}

export function advanceQueue(
  queue: AssistantTurnQueue,
  blockedAssistantMessageId?: string | null,
): AssistantTurnQueue | null {
  const nextCursor = queue.cursor + 1
  if (nextCursor >= queue.steps.length) return null
  return {
    ...queue,
    cursor: nextCursor,
    updatedAt: nowIso(),
    blockedAssistantMessageId: blockedAssistantMessageId ?? queue.blockedAssistantMessageId ?? null,
  }
}

export function withBlockedAssistantMessageId(
  queue: AssistantTurnQueue,
  assistantMessageId: string,
): AssistantTurnQueue {
  return {
    ...queue,
    blockedAssistantMessageId: assistantMessageId,
    updatedAt: nowIso(),
  }
}
