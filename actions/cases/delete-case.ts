"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteCase } from "@/modules/cases/delete-case"

export type DeleteCaseResult =
  | { ok: true }
  | { ok: false; error: string }

export async function deleteCaseAction(caseId: string): Promise<DeleteCaseResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  try {
    await deleteCase(supabase, caseId, profile.id)
    revalidatePath("/dashboard/cases")
    return { ok: true }
  } catch (e) {
    // `financial_entries.case_id` é `on delete restrict` (D-26 revisada): o banco RECUSA
    // apagar um caso que tenha lançamento, e o faturamento fica registrado para
    // auditoria (D-19). O sentinela do módulo vira mensagem PT-BR aqui — jamais um
    // `foreign_key_violation` cru na tela do médico.
    if (e instanceof Error && e.message.includes("CASE_HAS_FINANCIAL_ENTRIES")) {
      return {
        ok: false,
        error:
          "Este caso tem lançamentos no livro-caixa e não pode ser excluído. O faturamento fica registrado para auditoria.",
      }
    }
    const message =
      e instanceof Error ? e.message : "Erro ao excluir caso. Tente novamente."
    return { ok: false, error: message }
  }
}
