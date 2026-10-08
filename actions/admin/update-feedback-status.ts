"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdminAction } from "@/actions/admin/require-admin"
import { FEEDBACK_STATUSES, type FeedbackStatus } from "@/lib/feedback"
import { updateFeedbackStatus } from "@/modules/admin/update-feedback-status"

const schema = z.object({ id: z.uuid(), status: z.enum(FEEDBACK_STATUSES) })

/** Novo / Em análise / Feito na linha da aba Feedback. */
export async function updateFeedbackStatusAction(id: string, status: FeedbackStatus): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const parsed = schema.safeParse({ id, status })
  if (!parsed.success) return { ok: false, error: "Status inválido." }
  try {
    await updateFeedbackStatus(gate.admin, parsed.data.id, parsed.data.status)
    revalidatePath("/dashboard/admin/feedback")
    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao salvar." }
  }
}
