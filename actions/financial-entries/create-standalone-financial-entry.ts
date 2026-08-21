"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  standaloneFinancialEntrySchema,
  type StandaloneFinancialEntryFormValues,
} from "@/lib/schemas/financial-entry"
import { createFinancialEntries } from "@/modules/financial-entries/create-financial-entries"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type CreateStandaloneFinancialEntryResult =
  | { ok: true; entryId: string }
  | { ok: false; error: string }

/**
 * Registra um lançamento avulso — dinheiro que não veio de um caso (EARN-02, D-13).
 *
 * Gate de autenticação + gate de assinatura ANTES de ler o payload (T-10-09: a RLS
 * `to authenticated` não impõe assinatura). O valor em reais e a data mascarada são
 * validados aqui, no boundary, pelo schema (T-10-10) — o módulo recebe centavos e ISO.
 * O `profile_id` é estampado a partir da sessão e o `case_id` é sempre nulo.
 */
export async function createStandaloneFinancialEntryAction(
  data: StandaloneFinancialEntryFormValues,
): Promise<CreateStandaloneFinancialEntryResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = standaloneFinancialEntrySchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  try {
    const ids = await createFinancialEntries(supabase, profile.id, [
      {
        case_id: null,
        description: parsed.data.description,
        amount_cents: parsed.data.amount,
        payment_method: parsed.data.payment_method,
        received_on: parsed.data.received_on,
      },
    ])
    const entryId = ids[0]
    if (!entryId)
      return { ok: false, error: "Não foi possível registrar o lançamento. Tente novamente." }

    revalidatePath("/dashboard/earnings")
    return { ok: true, entryId }
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Erro ao registrar o lançamento. Tente novamente."
    return { ok: false, error: message }
  }
}
