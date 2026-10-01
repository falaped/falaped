"use server"

import { z } from "zod"

import { requireAdminAction } from "@/actions/admin/require-admin"
import { MESSAGE_CHANNELS, MESSAGE_MOMENTS } from "@/lib/message-template"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { saveMessageTemplate } from "@/modules/admin/save-message-template"

const templateSchema = z
  .object({
    moment: z.enum(MESSAGE_MOMENTS),
    channel: z.enum(MESSAGE_CHANNELS),
    name: z.string().trim().min(1, "Dê um nome ao modelo.").max(120),
    subject: z.string().trim().max(200).nullable(),
    body: z.string().trim().min(1, "Escreva o texto.").max(8000),
    archived: z.boolean().optional(),
  })
  .refine((t) => t.channel !== "email" || !!t.subject, { message: "E-mail precisa de assunto.", path: ["subject"] })

export type SaveMessageTemplateInput = z.infer<typeof templateSchema>

/** Cria ou edita um modelo de mensagem (arquivar = `archived: true`). */
export async function saveMessageTemplateAction(
  id: string | null,
  input: SaveMessageTemplateInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const parsed = templateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  try {
    return { ok: true, id: await saveMessageTemplate(gate.admin, id, parsed.data) }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao salvar o modelo." }
  }
}
