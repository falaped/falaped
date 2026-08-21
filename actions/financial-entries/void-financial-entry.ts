"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { voidFinancialEntry } from "@/modules/financial-entries/void-financial-entry"
import { financialEntryIdSchema } from "@/lib/schemas/financial-entry"

export type VoidFinancialEntryResult = { ok: true } | { ok: false; error: string }

/**
 * Anula um lançamento (EARN-05).
 *
 * `caseId` é opcional e serve SOMENTE para escolher o alvo de revalidação (a linha pode
 * ser anulada de dentro do caso, D-20). Ele NÃO participa da autorização: a autorização
 * é o duplo filtro (id + perfil) do módulo, então um `caseId` forjado não abre nada —
 * no pior caso revalida uma rota que o médico não pode ler.
 */
export async function voidFinancialEntryAction(
  entryId: string,
  caseId?: string | null,
): Promise<VoidFinancialEntryResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = financialEntryIdSchema.safeParse(entryId)
  if (!parsed.success) return { ok: false, error: "Lançamento inválido." }

  try {
    await voidFinancialEntry(supabase, parsed.data, profile.id)
    revalidatePath("/dashboard/earnings")
    if (caseId) revalidatePath(`/dashboard/cases/${caseId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao anular o lançamento. Tente novamente."
    return { ok: false, error: message }
  }
}
