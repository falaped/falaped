"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { getExamReadingById } from "@/modules/exam-readings/get-exam-reading-by-id"
import { updateExamReading } from "@/modules/exam-readings/update-exam-reading"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type SaveExamReadingReportResult = { ok: true } | { ok: false; error: string }

const REPORT_TEXT_MAX_CHARS = 20_000

/** Persiste o texto do relatório editado pelo médico. */
export async function saveExamReadingReportAction(params: {
  readingId: string
  reportText: string
}): Promise<SaveExamReadingReportResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const reportText = String(params.reportText ?? "").trim()
  if (reportText === "") return { ok: false, error: "O relatório está vazio." }
  if (reportText.length > REPORT_TEXT_MAX_CHARS)
    return { ok: false, error: "Relatório longo demais." }

  try {
    const reading = await getExamReadingById(supabase, profile.id, params.readingId)
    if (!reading) return { ok: false, error: "Leitura não encontrada." }
    await updateExamReading(supabase, profile.id, reading.id, { report_text: reportText })
    if (reading.case_id) revalidatePath(`/dashboard/cases/${reading.case_id}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao salvar o relatório. Tente novamente."
    return { ok: false, error: message }
  }
}
