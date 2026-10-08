"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"
import type { PatientSex } from "@/modules/patients/patient-sex"
import { listCaseActivityTimes } from "@/modules/cases/list-case-activity-times"
import { getConsultIndexByPatient, type ConsultIndexByPatient } from "@/modules/cases/get-consult-index-by-patient"

export type PatientSearchItem = {
  id: string
  name: string
  birthDate: string | null
  responsible: string | null
  contactPhone: string | null
  sex: PatientSex | null
  /** Início da consulta mais recente (ISO), ou null se nunca foi atendida. */
  lastConsultAt: string | null
}

export type ListPatientsForSearchResult =
  | {
      ok: true
      patients: PatientSearchItem[]
      /** Com as datas de atividade: o menu mostra se ela ficou esquecida aberta. */
      activeCase: (NonNullable<ConsultIndexByPatient["activeCase"]> & { activityAts: string[] }) | null
    }
  | { ok: false; error: string }

/**
 * Pacientes do médico para a busca do menu (⌘K), com a última consulta de cada um e a
 * consulta aberta. Só os campos que a busca mostra; o filtro roda no navegador.
 */
export async function listPatientsForSearchAction(): Promise<ListPatientsForSearchResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  try {
    // ponytail: lista inteira por médico; trocar por busca no banco se passar de alguns milhares.
    const [patients, index] = await Promise.all([
      getPatientsByProfileId(supabase, profile.id),
      getConsultIndexByPatient(supabase, profile.id),
    ])
    return {
      ok: true,
      activeCase: index.activeCase && {
        ...index.activeCase,
        activityAts: await listCaseActivityTimes(
          supabase,
          index.activeCase.id,
          index.activeCase.patientId,
          index.activeCase.startedAt,
        ).catch(() => []),
      },
      patients: patients.map((p) => ({
        id: p.id,
        name: p.name,
        birthDate: p.birth_date,
        responsible: p.responsible,
        contactPhone: p.contact_phone,
        sex: p.sex ?? null,
        lastConsultAt: index.lastConsultAt[p.id] ?? null,
      })),
    }
  } catch {
    return { ok: false, error: "Não foi possível carregar os pacientes. Tente de novo." }
  }
}
