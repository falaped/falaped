"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  togglePatientVaccineDoseSchema,
  type TogglePatientVaccineDoseInput,
} from "@/lib/schemas/patient-vaccine-dose"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { markDoseTaken } from "@/modules/patient-vaccine-doses/mark-dose-taken"
import { unmarkDoseTaken } from "@/modules/patient-vaccine-doses/unmark-dose-taken"

export type TogglePatientVaccineDoseResult =
  | { ok: true; taken: boolean }
  | { ok: false; error: string }

/**
 * Toggles a patient's applied-dose mark for a SPECIFIC reference item (VAC-05).
 *
 * Auth + paid gate, then zod-validates {patientId, scheduleItemId, taken}, then
 * verifies patient ownership via getPatientById (IDOR defense — an unowned or
 * unknown patient never reaches the mutation). Dispatches mark (taken=true) or
 * unmark (taken=false), both scoped by profile_id + patient_id server-side, and
 * revalidates the patient page so the ficha re-reads the taken set.
 *
 * Boolean grain — no date/lote/local (Phase 6). Position-only: this records the
 * applied dose but drives NO pending/late diff (D-11).
 */
export async function togglePatientVaccineDoseAction(
  input: TogglePatientVaccineDoseInput,
): Promise<TogglePatientVaccineDoseResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = togglePatientVaccineDoseSchema.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return { ok: false, error: msg }
  }

  const { patientId, scheduleItemId, taken } = parsed.data

  try {
    // Ownership verify: only proceed for a patient owned by this profile (IDOR).
    const patient = await getPatientById(supabase, patientId, profile.id)
    if (!patient) return { ok: false, error: "Paciente não encontrado." }

    if (taken) {
      await markDoseTaken(supabase, profile.id, patientId, scheduleItemId)
    } else {
      await unmarkDoseTaken(supabase, profile.id, patientId, scheduleItemId)
    }

    revalidatePath(`/dashboard/patients/${patientId}`)
    return { ok: true, taken }
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Erro ao atualizar a dose. Tente novamente."
    return { ok: false, error: message }
  }
}
