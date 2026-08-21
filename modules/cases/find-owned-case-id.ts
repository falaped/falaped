import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Confirma que um caso pertence ao perfil, resolvendo `profile_id` → telefone em
 * `authenticated_users` → `cases.user_phone`. Devolve o id do caso, ou `null`.
 *
 * `null` é a resposta ÚNICA para caso inexistente, caso alheio e perfil sem telefone
 * vinculado — quem chama devolve uma só mensagem neutra, sem enumeração por diferença
 * de mensagem (T-10-24).
 *
 * Existe porque a policy de RLS de `financial_entries` ancora só em `profile_id` e
 * NUNCA olha para `public.cases`: o `case_id` que chega do browser é uma superfície de
 * IDOR que só o action fecha (T-10-23). É a mesma resolução de
 * `modules/cases/update-case-status.ts` e `modules/cases/delete-case.ts`, extraída aqui
 * em vez de copiada uma terceira e quarta vez — e leve de propósito (`select("id")`),
 * porque `getCaseById` traz paciente e TODAS as mensagens do caso.
 */
export async function findOwnedCaseId(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
): Promise<string | null> {
  const { data: auRow, error: auError } = await supabase
    .from("authenticated_users")
    .select("phone")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (auError) throw new Error(`[CASES] Failed to resolve phone: ${auError.message}`)
  const userPhone = auRow?.phone ?? null
  if (!userPhone) return null

  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("user_phone", userPhone)
    .maybeSingle()

  if (caseError) throw new Error(`[CASES] Failed to fetch case: ${caseError.message}`)

  return (caseRow as { id: string } | null)?.id ?? null
}
