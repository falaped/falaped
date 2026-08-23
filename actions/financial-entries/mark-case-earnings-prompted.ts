"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { findOwnedCaseId } from "@/modules/cases/find-owned-case-id"
import { markCaseEarningsPrompted } from "@/modules/cases/mark-case-earnings-prompted"

export type MarkCaseEarningsPromptedResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Registra que o médico RESPONDEU a pergunta do lançamento sem lançar nada — o "Sem
 * cobrança" da etapa 2, que é cortesia permitida (D-09).
 *
 * Existe só para esse caminho: quando ele SALVA, quem marca é
 * `createCaseFinancialEntriesAction`, no mesmo servidor que fez o insert. Aqui não há
 * insert nenhum, então o único registro possível é este.
 *
 * A pergunta é UMA VEZ por caso: sem esta marca, cortesia deixa zero lançamento, a
 * guarda D-10 (que só conta lançamentos) não distingue "dispensou" de "ainda não
 * perguntei", e reabrir + encerrar o mesmo caso perguntava de novo.
 */
export async function markCaseEarningsPromptedAction(
  caseId: string,
): Promise<MarkCaseEarningsPromptedResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  try {
    // Posse ANTES da escrita, com mensagem neutra única (T-10-23 / T-10-24).
    const ownedCaseId = await findOwnedCaseId(supabase, caseId, profile.id)
    if (!ownedCaseId) return { ok: false, error: "Caso inválido para este perfil." }

    await markCaseEarningsPrompted(supabase, ownedCaseId)
    revalidatePath(`/dashboard/cases/${caseId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao registrar a dispensa. Tente novamente."
    return { ok: false, error: message }
  }
}
