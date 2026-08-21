"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { findOwnedCaseId } from "@/modules/cases/find-owned-case-id"
import { countNonVoidedEntriesForCase } from "@/modules/financial-entries/count-non-voided-entries-for-case"
import {
  listProcedureCatalogItems,
  type ProcedureCatalogItemOption,
} from "@/modules/procedure-catalog/list-procedure-catalog-items"

export type PrepareCaseEarningsResult =
  | { ok: true; ask: false }
  | {
      ok: true
      ask: true
      consultationPriceCents: number | null
      procedures: ProcedureCatalogItemOption[]
    }
  | { ok: false; error: string }

/**
 * Decide se o app deve perguntar o que foi cobrado depois de encerrar um caso, e entrega
 * o pré-preenchimento da etapa 2 no MESMO round-trip (EARN-01).
 *
 * `ask: false` é a guarda D-10: o caso já tem lançamento não-anulado, então nada é
 * perguntado e nenhuma UI extra aparece — silêncio é o requisito.
 *
 * Existe como action (e não como props do RSC) porque `CaseDetailActions` está três
 * componentes cliente abaixo do RSC: descer o valor da consulta e o catálogo inteiro por
 * essa cadeia é diff grande e acoplamento gratuito. Só `earningsCount` e
 * `earningsTotalCents` descem por props, porque o aviso de exclusão precisa deles já na
 * renderização.
 */
export async function prepareCaseEarningsAction(
  caseId: string,
): Promise<PrepareCaseEarningsResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  try {
    // Posse do caso ANTES de qualquer leitura financeira: a RLS de financial_entries
    // nunca olha para public.cases (T-10-23). Mensagem neutra única (T-10-24).
    const ownedCaseId = await findOwnedCaseId(supabase, caseId, profile.id)
    if (!ownedCaseId) return { ok: false, error: "Caso inválido para este perfil." }

    const alreadyBilled = await countNonVoidedEntriesForCase(
      supabase,
      profile.id,
      ownedCaseId,
    )
    if (alreadyBilled > 0) return { ok: true, ask: false }

    const procedures = await listProcedureCatalogItems(supabase, profile.id)
    return {
      ok: true,
      ask: true,
      consultationPriceCents: profile.consultation_price_cents ?? null,
      procedures,
    }
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Erro ao preparar o lançamento. Tente novamente."
    return { ok: false, error: message }
  }
}
