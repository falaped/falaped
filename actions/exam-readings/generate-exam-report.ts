"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { confirmExamReadingItemsSchema } from "@/lib/schemas/exam-reading"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { getExamReadingById } from "@/modules/exam-readings/get-exam-reading-by-id"
import { updateExamReading } from "@/modules/exam-readings/update-exam-reading"
import { resolveExamPatient } from "@/modules/exam-readings/resolve-exam-patient"
import { generateExamReport } from "@/modules/groq/generate-exam-report"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type GenerateExamReportResult =
  | { ok: true; reportText: string }
  | { ok: false; error: string }

/**
 * Grava os itens CONFIRMADOS pelo médico e redige o rascunho do relatório a
 * partir deles. A confirmação e a redação são um passo só de propósito: o texto
 * nunca nasce de dado que o médico não viu.
 */
export async function generateExamReportAction(params: {
  readingId: string
  items: unknown
}): Promise<GenerateExamReportResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = confirmExamReadingItemsSchema.safeParse(params.items)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  if (parsed.data.length === 0)
    return { ok: false, error: "Confirme ao menos um resultado antes de gerar o relatório." }

  try {
    const reading = await getExamReadingById(supabase, profile.id, params.readingId)
    if (!reading) return { ok: false, error: "Leitura não encontrada." }
    const patient = await getPatientById(supabase, reading.patient_id, profile.id)
    if (!patient) return { ok: false, error: "Paciente não encontrado." }

    // O paciente do LAUDO manda (nome, nascimento, sexo); o do caso só entra no que faltar.
    const examPatient = resolveExamPatient(reading.exam_info, patient)

    const reportText = await generateExamReport({
      patientAgeLabel: examPatient.ageLabel,
      patientSex: examPatient.sexLabel,
      examInfo: reading.exam_info,
      items: parsed.data,
    })

    await updateExamReading(supabase, profile.id, reading.id, {
      items: parsed.data,
      report_text: reportText,
    })

    if (reading.case_id) revalidatePath(`/dashboard/cases/${reading.case_id}`)
    return { ok: true, reportText }
  } catch (e) {
    console.error("[EXAM_READINGS] generate report failed", e)
    const message =
      e instanceof Error ? e.message : "Erro ao gerar o relatório. Tente novamente."
    return { ok: false, error: message }
  }
}
