"use server"

import { z } from "zod"

import { requireAdminAction } from "@/actions/admin/require-admin"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { addSubscriptionPayment } from "@/modules/admin/add-subscription-payment"

const isoDate = z.iso.date()

const paymentSchema = z
  .object({
    profileId: z.uuid(),
    amountCents: z.number().int().min(0),
    paidAt: isoDate,
    validUntil: isoDate,
    note: z.string().trim().max(500).nullable(),
  })
  .refine((p) => p.validUntil >= p.paidAt, {
    message: "O vencimento precisa ser depois do pagamento.",
    path: ["validUntil"],
  })

export type AddSubscriptionPaymentInput = z.infer<typeof paymentSchema>
export type AddSubscriptionPaymentResult = { ok: true } | { ok: false; error: string }

/** Painel admin: lança um pagamento manual (valor + período) e marca a conta como paga. */
export async function addSubscriptionPaymentAction(
  input: AddSubscriptionPaymentInput,
): Promise<AddSubscriptionPaymentResult> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate

  const parsed = paymentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }

  const { profileId, amountCents, paidAt, validUntil, note } = parsed.data
  try {
    await addSubscriptionPayment(gate.admin, {
      profile_id: profileId,
      amount_cents: amountCents,
      paid_at: paidAt,
      valid_until: validUntil,
      note: note || null,
    })
    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao lançar o pagamento." }
  }
}
