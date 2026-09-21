"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { updateCaseStatus } from "@/modules/cases/update-case-status"
import { generateCaseCarryoverSummary } from "@/modules/groq/generate-case-carryover-summary"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { getCaseReports } from "@/modules/cases/get-case-report"
import { updateCaseSummary } from "@/modules/cases/update-case-summary"
import { getPhoneByProfileId } from "@/modules/authenticated-users/get-phone-by-profile-id"
import { listCaseReminders } from "@/modules/cases/list-case-reminders"
import { env } from "@/lib/env"
import type { SupabaseClient } from "@supabase/supabase-js"

export type UpdateCaseStatusResult =
  | { ok: true }
  | { ok: false; error: string }

export async function updateCaseStatusAction(
  caseId: string,
  status: "active" | "closed",
): Promise<UpdateCaseStatusResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  try {
    await updateCaseStatus(supabase, caseId, profile.id, status)

    // Resumo para a PRÓXIMA consulta, gerado uma vez ao fechar esta. Depois do
    // update de propósito e sem poder derrubá-lo: fechar a consulta é a ação do
    // médico, o resumo é apoio. Falhou, fica sem resumo e o modal da próxima
    // mostra só os lembretes escritos à mão.
    if (status === "closed") {
      await generateAndStoreCarryoverSummary(supabase, caseId, profile.id).catch(
        (error: unknown) => {
          console.error("[CASES] carryover summary failed", { caseId, error })
        },
      )
    }

    revalidatePath("/dashboard/cases")
    revalidatePath(`/dashboard/cases/${caseId}`)
    // Workspace route is cached (cacheComponents); without this, reopening a case
    // and entering the workspace shows a stale/frozen timer from the prior session.
    revalidatePath(`/dashboard/cases/new/${caseId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao atualizar status do caso. Tente novamente."
    return { ok: false, error: message }
  }
}

/**
 * Monta o material do atendimento (conversa + relatório + lembretes), pede o
 * mini resumo e grava. Carimba `summary_generated_at` mesmo sem texto: "tentou e
 * não saiu" é diferente de "nunca tentou".
 */
async function generateAndStoreCarryoverSummary(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
): Promise<void> {
  const phone = await getPhoneByProfileId(supabase, profileId)
  if (!phone) return

  const caseDetail = await getCaseById(supabase, caseId, profileId)
  if (!caseDetail) return

  const conversationText = caseDetail.messages
    .map((m) => `${m.role === "user" ? "Médico" : "Assistente"}: ${m.content}`)
    .join("\n")
    .trim()

  const reports = await getCaseReports(supabase, caseId, profileId)
  const reportText =
    reports
      .flatMap((report) => report.sections)
      .map((section) => `${section.name}: ${section.content}`)
      .join("\n")
      .trim() || null

  // Os lembretes viram uma lista com marcador: o modelo recebe "são N itens",
  // não um parágrafo onde dois lembretes podem virar um.
  const reminderRows = await listCaseReminders(supabase, profileId, caseId).catch(
    () => [],
  )
  const reminders =
    reminderRows.map((row) => `• ${row.text}`).join("\n").trim() || null

  // Nada de material e nenhum lembrete: não há o que resumir, e chamar a IA para
  // isso só queimaria uma requisição.
  if (!conversationText && !reportText && !reminders) {
    await updateCaseSummary(supabase, caseId, phone, null)
    return
  }

  // Sem IA configurada, o lembrete escrito à mão ainda precisa chegar na próxima
  // consulta — ele vem do campo `reminders`, que o modal lê direto.
  if (!env.GROQ_API_KEY?.trim()) {
    await updateCaseSummary(supabase, caseId, phone, null)
    return
  }

  const summary = await generateCaseCarryoverSummary({
    conversationText,
    reportText,
    reminders,
  })

  await updateCaseSummary(supabase, caseId, phone, summary)
}
