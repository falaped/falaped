import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Marca que a pergunta do lançamento financeiro deste caso foi RESPONDIDA — salvou o
 * lançamento ou dispensou com "Sem cobrança" (cortesia, D-09). Depois disso nada mais
 * pergunta, nem reabrindo e encerrando o mesmo caso: é o mesmo atendimento.
 *
 * `caseId` DEVE vir de `findOwnedCaseId`: a posse é responsabilidade de quem chama, e a
 * policy "Cases update own" é o segundo cadeado (a RLS de `cases` ancora em `profile_id`
 * OU `user_phone`, então um id alheio não passa).
 *
 * `is("earnings_prompted_at", null)` mantém a PRIMEIRA resposta: uma segunda chamada
 * (duplo clique, action reexecutado) não reescreve o timestamp. Sem `.select()` —
 * zero linha afetada é sucesso, não erro.
 */
export async function markCaseEarningsPrompted(
  supabase: SupabaseClient,
  caseId: string,
): Promise<void> {
  const { error } = await supabase
    .from("cases")
    .update({ earnings_prompted_at: new Date().toISOString() })
    .eq("id", caseId)
    .is("earnings_prompted_at", null)

  if (error) {
    throw new Error(`[CASES] Failed to mark earnings prompt: ${error.message}`)
  }
}
