"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { getScaleByKey, scoreScale } from "@/lib/scales"
import {
  createScaleResultSchema,
  type CreateScaleResultFormData,
} from "@/lib/schemas/patient-scale-result"
import { findOwnedCaseId } from "@/modules/cases/find-owned-case-id"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { createScaleResult } from "@/modules/patient-scales/create-scale-result"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type CreateScaleResultResult =
  | { ok: true; scaleResultId: string; score: number; interpretation: string }
  | { ok: false; error: string }

/**
 * Registra uma aplicação de escala para um paciente do médico logado.
 *
 * O escore e a interpretação são recalculados AQUI a partir da definição da
 * escala — o que vem do browser é só a escala e as respostas. A posse do
 * paciente e do atendimento é confirmada antes da escrita: a RLS ancora em
 * `profile_id` e não olha para `patients`/`cases`, então o `patientId`/`caseId`
 * que chega do cliente é superfície de IDOR que só a action fecha.
 */
export async function createScaleResultAction(
  data: CreateScaleResultFormData,
): Promise<CreateScaleResultResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = createScaleResultSchema.safeParse(data)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return { ok: false, error: msg }
  }

  const scale = getScaleByKey(parsed.data.scaleKey)
  if (!scale) return { ok: false, error: "Escala não encontrada." }

  try {
    const patient = await getPatientById(
      supabase,
      parsed.data.patientId,
      profile.id,
    )
    if (!patient) return { ok: false, error: "Paciente não encontrado." }

    const caseId = parsed.data.caseId ?? null
    if (caseId) {
      const ownedCaseId = await findOwnedCaseId(supabase, caseId, profile.id)
      if (!ownedCaseId)
        return { ok: false, error: "Atendimento não encontrado." }
    }

    const { score, band } = scoreScale(scale, parsed.data.answers)

    const result = await createScaleResult(supabase, profile.id, {
      patient_id: parsed.data.patientId,
      case_id: caseId,
      scale_key: scale.key,
      answers: parsed.data.answers,
      score,
      interpretation: band.label,
    })

    revalidatePath(`/dashboard/patients/${parsed.data.patientId}`)
    if (caseId) revalidatePath(`/dashboard/cases/${caseId}`)

    return {
      ok: true,
      scaleResultId: result.id,
      score,
      interpretation: band.label,
    }
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Erro ao registrar a escala. Tente novamente."
    return { ok: false, error: message }
  }
}
