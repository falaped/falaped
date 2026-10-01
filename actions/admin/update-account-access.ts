"use server"

import { z } from "zod"

import { requireAdminAction } from "@/actions/admin/require-admin"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { updateAuthenticatedUserAccess } from "@/modules/authenticated-users/update-authenticated-user-access"

const accessSchema = z.object({
  profileId: z.uuid(),
  status: z.enum(["paid", "unpaid", "blocked"]),
  trialEndsAt: z.iso.datetime({ offset: true }).nullable(),
})

export type UpdateAccountAccessInput = z.infer<typeof accessSchema>
export type UpdateAccountAccessResult = { ok: true } | { ok: false; error: string }

/** Painel admin: define o status da conta e o fim do teste grátis. Só o admin muda isso. */
export async function updateAccountAccessAction(
  input: UpdateAccountAccessInput,
): Promise<UpdateAccountAccessResult> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate

  const parsed = accessSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }

  const { profileId, status, trialEndsAt } = parsed.data
  try {
    await updateAuthenticatedUserAccess(gate.admin, profileId, { status, trial_ends_at: trialEndsAt })
    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao salvar o acesso." }
  }
}
