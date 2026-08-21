import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Anula um lançamento (EARN-05). Anular é a ÚNICA forma de corrigir: nenhuma camada
 * desta fase exclui um lançamento, e a tabela não tem policy de exclusão — a RLS nega
 * DELETE por default, então mesmo um caminho direto por PostgREST afeta zero linhas.
 *
 * **Duplo filtro obrigatório (id + perfil).** Escopar a mutação somente pelo id é
 * proibido: seria anular o lançamento de outro médico conhecendo um UUID. A RLS
 * owner-scoped é a segunda camada, e o duplo filtro é a primeira — as duas afirmadas
 * por spec com mock gravador (T-10-31).
 *
 * **Só a coluna de anulação é escrita.** É esse recorte que impede a policy de UPDATE do
 * banco de se tornar uma porta de edição de valor (D-19 / T-10-34): existe UPDATE para
 * anular e desanular, nunca para mexer no dinheiro de uma linha já registrada.
 *
 * Anular um lançamento já anulado é inofensivo — sobrescreve o timestamp e não duplica
 * nem corrompe dado. E nada expira no servidor: a janela do desfazer é a vida do toast.
 */
export async function voidFinancialEntry(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from("financial_entries")
    .update({ voided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(`[EARNINGS] Failed to void entry: ${error.message}`)
  }
}
