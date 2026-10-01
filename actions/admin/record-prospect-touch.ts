"use server"

import { z } from "zod"

import { requireAdminAction } from "@/actions/admin/require-admin"
import { MESSAGE_MOMENTS } from "@/lib/message-template"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { recordProspectTouch, type TouchUndo } from "@/modules/admin/record-prospect-touch"
import { undoProspectTouch } from "@/modules/admin/undo-prospect-touch"

const touchSchema = z.object({
  channel: z.enum(["whatsapp", "telefone"]),
  detail: z.string().trim().max(300).nullable(),
  send: z
    .object({
      templateId: z.uuid().nullable(),
      moment: z.enum(MESSAGE_MOMENTS),
      body: z.string().trim().min(1).max(4000),
    })
    .optional(),
})

const undoSchema = z.object({
  prospectId: z.string().min(1),
  eventId: z.number().int(),
  sendId: z.uuid().nullable(),
  previous: z.object({
    status: z.enum(["novo", "contatado", "respondeu", "perdido"]),
    last_channel: z.enum(["email", "whatsapp", "telefone"]).nullable(),
    last_contact_at: z.string().nullable(),
    next_contact_at: z.string().nullable(),
  }),
})

export type RecordProspectTouchInput = z.infer<typeof touchSchema>

/** WhatsApp aberto (com a mensagem escolhida) ou ligação feita: registra o toque e devolve o "Desfazer". */
export async function recordProspectTouchAction(
  id: string,
  input: RecordProspectTouchInput,
): Promise<{ ok: true; undo: TouchUndo } | { ok: false; error: string }> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const parsed = touchSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  const { send, ...touch } = parsed.data
  try {
    const undo = await recordProspectTouch(gate.admin, id, {
      ...touch,
      send: send && { ...send, subject: null },
    })
    return { ok: true, undo }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao registrar o toque." }
  }
}

/** Desfaz o último toque registrado (clicou no WhatsApp por engano). */
export async function undoProspectTouchAction(undo: TouchUndo): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const parsed = undoSchema.safeParse(undo)
  if (!parsed.success) return { ok: false, error: "Não foi possível desfazer." }
  try {
    await undoProspectTouch(gate.admin, parsed.data)
    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao desfazer." }
  }
}
