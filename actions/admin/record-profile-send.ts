"use server"

import { z } from "zod"

import { requireAdminAction } from "@/actions/admin/require-admin"
import { MESSAGE_MOMENTS } from "@/lib/message-template"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { recordProfileSend } from "@/modules/admin/record-profile-send"

const sendSchema = z.object({
  profileId: z.uuid(),
  templateId: z.uuid().nullable(),
  moment: z.enum(MESSAGE_MOMENTS),
  body: z.string().trim().min(1).max(4000),
})

/** WhatsApp aberto para um cliente com a mensagem escolhida: entra no histórico do modelo. */
export async function recordProfileWhatsappAction(
  input: z.infer<typeof sendSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const parsed = sendSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  try {
    await recordProfileSend(gate.admin, { ...parsed.data, channel: "whatsapp", subject: null })
    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao registrar o envio." }
  }
}
