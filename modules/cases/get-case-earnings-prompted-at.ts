import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Devolve quando a pergunta do lançamento financeiro deste caso foi RESPONDIDA, ou
 * `null` se ela ainda está em aberto.
 *
 * Consulta separada da posse (`findOwnedCaseId`) de propósito: quem chama precisa ter
 * validado a posse ANTES, porque a policy de RLS de `cases` cobre esta leitura mas a
 * mensagem de erro do action é única e neutra (T-10-24) — a distinção entre "caso
 * alheio" e "pergunta em aberto" não pode vazar por diferença de resposta.
 *
 * O que a coluna significa está no comentário da migration: cortesia deixa ZERO
 * lançamento, então contar lançamentos (guarda D-10) não distingue "dispensou" de
 * "ainda não perguntei". Só este timestamp distingue.
 */
export async function getCaseEarningsPromptedAt(
  supabase: SupabaseClient,
  caseId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("cases")
    .select("earnings_prompted_at")
    .eq("id", caseId)
    .maybeSingle()

  if (error) {
    throw new Error(`[CASES] Failed to read earnings prompt state: ${error.message}`)
  }

  return (data as { earnings_prompted_at: string | null } | null)?.earnings_prompted_at ?? null
}
