"use server"

import { z } from "zod"

import { requireAdminAction } from "@/actions/admin/require-admin"
import { ADMIN_SENDER } from "@/lib/admin-sender"
import { MESSAGE_CHANNELS, MESSAGE_MOMENTS } from "@/lib/message-template"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { draftMessageWithAi, type MessageDraft } from "@/modules/admin/draft-message-with-ai"

const draftSchema = z.object({
  channel: z.enum(MESSAGE_CHANNELS),
  moment: z.enum(MESSAGE_MOMENTS),
  instruction: z.string().trim().max(1000).nullable(),
  context: z.string().trim().max(2000).nullable(),
  base: z.object({ subject: z.string().max(200).nullable(), body: z.string().max(8000) }).nullable(),
  keepVariables: z.boolean(),
})

/** "Gerar com IA": rascunho no tom do CEO a partir do momento, da ficha e da instrução. */
export async function draftMessageWithAiAction(
  input: z.infer<typeof draftSchema>,
): Promise<{ ok: true; draft: MessageDraft } | { ok: false; error: string }> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const parsed = draftSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  try {
    return { ok: true, draft: await draftMessageWithAi({ ...parsed.data, sender: ADMIN_SENDER }) }
  } catch (error: unknown) {
    console.error("[ADMIN] draftMessageWithAi", error)
    return { ok: false, error: error instanceof Error ? error.message.replace(/^\[ADMIN\] /, "") : "Falha ao gerar o texto." }
  }
}
