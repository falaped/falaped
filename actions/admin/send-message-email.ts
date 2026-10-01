"use server"

import { z } from "zod"

import { requireAdminAction } from "@/actions/admin/require-admin"
import { MESSAGE_MOMENTS } from "@/lib/message-template"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { sendMessageEmail } from "@/modules/admin/send-message-email"

const emailSchema = z.object({
  to: z.union([z.object({ prospectId: z.string().min(1) }), z.object({ profileId: z.uuid() })]),
  templateId: z.uuid().nullable(),
  templateName: z.string().max(200).nullable(),
  moment: z.enum(MESSAGE_MOMENTS),
  subject: z.string().trim().min(1, "Escreva o assunto.").max(200),
  body: z.string().trim().min(1, "Escreva o texto.").max(8000),
})

export type SendMessageEmailInput = z.infer<typeof emailSchema>

/** Envia o e-mail revisado no composer para um lead ou cliente. */
export async function sendMessageEmailAction(input: SendMessageEmailInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const parsed = emailSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  try {
    await sendMessageEmail(gate.admin, parsed.data)
    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao enviar o e-mail." }
  }
}
