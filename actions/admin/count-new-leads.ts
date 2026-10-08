"use server"

import { requireAdminAction } from "@/actions/admin/require-admin"
import { countNewFeedback } from "@/modules/admin/count-new-feedback"
import { countNewLeads } from "@/modules/admin/count-new-leads"

/** Aviso de lead novo no menu. Só admin: para qualquer outra conta o gate devolve erro, sem dado. */
export async function countNewLeadsAction(): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  try {
    return { ok: true, count: await countNewLeads(gate.admin) }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao contar leads." }
  }
}

/** Aviso de feedback novo no menu, com o mesmo gate. */
export async function countNewFeedbackAction(): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  try {
    return { ok: true, count: await countNewFeedback(gate.admin) }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao contar feedback." }
  }
}
