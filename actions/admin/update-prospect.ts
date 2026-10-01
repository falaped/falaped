"use server"

import { z } from "zod"

import { requireAdminAction } from "@/actions/admin/require-admin"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { PROSPECT_STATUSES, type ProspectRow } from "@/modules/admin/list-prospects"
import { updateProspect } from "@/modules/admin/update-prospect"

const text = (max: number) => z.string().trim().max(max).optional()
const patchSchema = z.object({
  status: z.enum(PROSPECT_STATUSES).optional(),
  lost_reason: text(300),
  title: text(20),
  full_name: text(200),
  city: text(120),
  email: z.union([z.literal(""), z.email("E-mail inválido")]).optional(),
  phone: text(120),
  crm: text(40),
  clinic: text(200),
  next_contact_at: z.iso.datetime({ offset: true }).nullable().optional(),
})

export type UpdateProspectInput = z.infer<typeof patchSchema>
export type UpdateProspectResult = { ok: true; prospect: ProspectRow } | { ok: false; error: string }

/** Salva etapa (com motivo da perda), contato ou próximo contato de uma pessoa do funil. */
export async function updateProspectAction(id: string, input: UpdateProspectInput): Promise<UpdateProspectResult> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate

  const parsed = patchSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }

  // Texto vazio vira null, para "sem e-mail" continuar honesto. O nome curto segue o completo.
  const patch = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v]),
  ) as Record<string, string | null>
  if (patch.full_name) patch.name = patch.full_name.replace(/^(dra?\.|prof\.)\s+/i, "").split(/\s+/)[0]!
  if (patch.full_name === null) delete patch.full_name

  try {
    return { ok: true, prospect: await updateProspect(gate.admin, id, patch) }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao salvar." }
  }
}
