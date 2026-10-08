import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Quando cada consulta encerrada do médico terminou (ISO), para contar consultas por mês
 * nas abas Ano e Desde o início do Financeiro.
 * ponytail: lista inteira; agrupar no banco se um médico passar de dezenas de milhares.
 * @throws Error("[EARNINGS] ...") se a leitura falhar
 */
export async function listClosedCaseEndings(supabase: SupabaseClient, profileId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("cases")
    .select("ended_at")
    .eq("profile_id", profileId)
    .eq("status", "closed")
    .not("ended_at", "is", null)
  if (error) throw new Error(`[EARNINGS] Failed to list closed cases: ${error.message}`)
  return (data ?? []).map((row) => row.ended_at as string)
}
