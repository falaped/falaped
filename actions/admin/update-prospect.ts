"use server"

import { z } from "zod"

import { requireAdminAction } from "@/actions/admin/require-admin"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { CONTACT_CHANNELS, PROSPECT_STATUSES, type ProspectRow } from "@/modules/admin/list-prospects"
import { updateProspect } from "@/modules/admin/update-prospect"

const patchSchema = z.object({
  status: z.enum(PROSPECT_STATUSES).optional(),
  email: z.union([z.literal(""), z.email("E-mail inválido")]).optional(),
  phone: z.string().trim().max(120).optional(),
  crm: z.string().trim().max(40).optional(),
  clinic: z.string().trim().max(200).optional(),
  notes: z.string().max(4000).optional(),
  last_channel: z.enum(CONTACT_CHANNELS).optional(),
  last_contact_at: z.iso.datetime({ offset: true }).optional(),
  next_contact_at: z.iso.datetime({ offset: true }).nullable().optional(),
})

export type UpdateProspectInput = z.infer<typeof patchSchema>
export type UpdateProspectResult = { ok: true; prospect: ProspectRow } | { ok: false; error: string }

/** Salva status, contato, toque (canal + próximo contato) ou notas de um prospect (painel admin). */
export async function updateProspectAction(id: string, input: UpdateProspectInput): Promise<UpdateProspectResult> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate

  const parsed = patchSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }

  // Campos de contato vazios viram null, para o filtro "com e-mail" continuar honesto.
  const { status, notes, last_channel, last_contact_at, next_contact_at, ...contact } = parsed.data
  const patch = {
    ...(status !== undefined && { status }),
    ...(notes !== undefined && { notes }),
    ...(last_channel !== undefined && { last_channel }),
    ...(last_contact_at !== undefined && { last_contact_at }),
    ...(next_contact_at !== undefined && { next_contact_at }),
    ...Object.fromEntries(Object.entries(contact).map(([k, v]) => [k, v === "" ? null : v])),
  }

  try {
    return { ok: true, prospect: await updateProspect(gate.admin, id, patch) }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao salvar o prospect." }
  }
}
