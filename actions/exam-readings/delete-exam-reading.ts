"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { deleteExamReading } from "@/modules/exam-readings/delete-exam-reading"
import { getExamReadingById } from "@/modules/exam-readings/get-exam-reading-by-id"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type DeleteExamReadingResult = { ok: true } | { ok: false; error: string }

/** Apaga uma leitura (páginas + registro) do médico logado. */
export async function deleteExamReadingAction(
  readingId: string,
): Promise<DeleteExamReadingResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  try {
    const reading = await getExamReadingById(supabase, profile.id, readingId)
    if (!reading) return { ok: false, error: "Leitura não encontrada." }
    await deleteExamReading(supabase, profile.id, reading.id, reading.page_paths)
    revalidatePath(`/dashboard/patients/${reading.patient_id}`)
    if (reading.case_id) revalidatePath(`/dashboard/cases/${reading.case_id}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao apagar a leitura. Tente novamente."
    return { ok: false, error: message }
  }
}
