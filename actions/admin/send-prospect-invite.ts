"use server"

import { requireAdminAction } from "@/actions/admin/require-admin"
import type { ProspectRow } from "@/modules/admin/list-prospects"
import { sendProspectInvite } from "@/modules/admin/send-prospect-invite"

export type SendProspectInviteResult = { ok: true; prospect: ProspectRow } | { ok: false; error: string }

/** Envia o convite (15 dias grátis) por e-mail para um prospect e registra o envio. */
export async function sendProspectInviteAction(id: string): Promise<SendProspectInviteResult> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  try {
    return { ok: true, prospect: await sendProspectInvite(gate.admin, id) }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao enviar o convite." }
  }
}
