"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  caseFinancialEntriesSchema,
  type CaseFinancialEntriesFormValues,
} from "@/lib/schemas/financial-entry"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { findOwnedCaseId } from "@/modules/cases/find-owned-case-id"
import {
  createFinancialEntries,
  type NewFinancialEntryRow,
} from "@/modules/financial-entries/create-financial-entries"
import { listProcedureCatalogItems } from "@/modules/procedure-catalog/list-procedure-catalog-items"

export type CreateCaseFinancialEntriesResult =
  | { ok: true; created: number }
  | { ok: false; error: string }

/**
 * Grava os lançamentos do encerramento de um caso (EARN-01, D-07): 1 linha da consulta +
 * 1 por procedimento marcado, num ÚNICO insert.
 *
 * Ordem obrigatória: gate de assinatura → validação Zod → posse do caso → posse e rótulo
 * dos procedimentos → montagem → descarte das linhas de valor zero → insert.
 */
export async function createCaseFinancialEntriesAction(
  data: CaseFinancialEntriesFormValues,
): Promise<CreateCaseFinancialEntriesResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = caseFinancialEntriesSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }
  const { caseId, receivedOn, paymentMethod, consultationAmount, procedures } = parsed.data

  try {
    // (1) Posse do caso. Obrigatório, não opcional: a policy de RLS de
    // financial_entries ancora só em profile_id e NUNCA olha para public.cases, então o
    // case_id vindo do browser é uma superfície de IDOR que só este action fecha
    // (T-10-23). Mensagem neutra única para caso inexistente e caso alheio (T-10-24).
    const ownedCaseId = await findOwnedCaseId(supabase, caseId, profile.id)
    if (!ownedCaseId) return { ok: false, error: "Caso inválido para este perfil." }

    // (2) Posse e RÓTULO dos procedimentos: o `description` sai do catálogo do próprio
    // perfil, no servidor, nunca de um texto do cliente (T-10-25). Um id fora do
    // catálogo derruba a requisição inteira, sem nenhum insert.
    const catalog =
      procedures.length > 0
        ? await listProcedureCatalogItems(supabase, profile.id)
        : []
    const rows: NewFinancialEntryRow[] = []

    if (consultationAmount !== undefined) {
      rows.push({
        case_id: ownedCaseId,
        description: "Consulta",
        amount_cents: consultationAmount,
        payment_method: paymentMethod,
        received_on: receivedOn,
      })
    }

    for (const procedure of procedures) {
      const item = catalog.find((c) => c.id === procedure.catalogItemId)
      if (!item) return { ok: false, error: "Procedimento inválido para este perfil." }
      rows.push({
        case_id: ownedCaseId,
        description: item.name,
        amount_cents: procedure.amount,
        payment_method: paymentMethod,
        received_on: receivedOn,
      })
    }

    // (3-bis) Descarta as linhas de valor zero. É aqui que a permissão de zero do
    // catálogo (`price_cents >= 0`) se reconcilia com a constraint `amount_cents > 0`:
    // um procedimento gratuito realizado não gera lançamento, porque não há dinheiro a
    // lançar. Não é erro, não gera mensagem e não interrompe as outras linhas — a mesma
    // lógica de cortesia (D-09) aplicada por LINHA. A alternativa (bloquear o checkbox
    // de um procedimento gratuito na UI) seria mais código e pior UX: o médico não
    // conseguiria marcar um procedimento que ele de fato realizou.
    const billableRows = rows.filter((row) => row.amount_cents > 0)

    // (4) Cortesia — inclusive quando TODAS as linhas foram descartadas acima — não é
    // erro: sucesso sem tocar no banco.
    if (billableRows.length === 0) return { ok: true, created: 0 }

    // (5) Um único insert é uma transação implícita: consulta + N procedimentos entram
    // juntos ou não entram. Um conjunto parcial nunca pode ser observado.
    const ids = await createFinancialEntries(supabase, profile.id, billableRows)

    revalidatePath("/dashboard/earnings")
    revalidatePath(`/dashboard/cases/${ownedCaseId}`)
    return { ok: true, created: ids.length }
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Erro ao registrar os lançamentos. Tente novamente."
    return { ok: false, error: message }
  }
}
