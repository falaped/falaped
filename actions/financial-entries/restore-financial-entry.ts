"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { restoreFinancialEntry } from "@/modules/financial-entries/restore-financial-entry"
import { financialEntryIdSchema } from "@/lib/schemas/financial-entry"

export type RestoreFinancialEntryResult = { ok: true } | { ok: false; error: string }

/**
 * Desfaz a anulação de um lançamento (EARN-05) — o "Desfazer" do toast.
 *
 * É uma ESCRITA gateada de verdade, com os mesmos dois gates da anulação, e não um
 * rollback de cliente. Tratar o desfazer como detalhe de UI é como ele ficaria sem gate
 * (T-10-36).
 *
 * Não existe janela do lado do servidor: a janela é a vida do toast. Este action ou
 * encontra a linha anulada e a restaura, ou a encontra já restaurada e não faz nada —
 * nenhum dos dois caminhos duplica ou corrompe dado. Nenhum timer, nenhuma coluna de
 * validade (D-22).
 */
export async function restoreFinancialEntryAction(
  entryId: string,
  caseId?: string | null,
): Promise<RestoreFinancialEntryResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = financialEntryIdSchema.safeParse(entryId)
  if (!parsed.success) return { ok: false, error: "Lançamento inválido." }

  try {
    await restoreFinancialEntry(supabase, parsed.data, profile.id)
    revalidatePath("/dashboard/earnings")
    if (caseId) revalidatePath(`/dashboard/cases/${caseId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Erro ao desfazer a anulação. Tente novamente."
    return { ok: false, error: message }
  }
}
