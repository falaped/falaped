"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"

export type PatientSearchItem = {
  id: string
  name: string
  birthDate: string | null
  responsible: string | null
  contactPhone: string | null
}

export type ListPatientsForSearchResult =
  | { ok: true; patients: PatientSearchItem[] }
  | { ok: false; error: string }

/**
 * Pacientes do médico para a busca do menu (⌘K). Só os campos que a busca mostra;
 * o filtro roda no navegador.
 */
export async function listPatientsForSearchAction(): Promise<ListPatientsForSearchResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  try {
    // ponytail: lista inteira por médico; trocar por busca no banco se passar de alguns milhares.
    const patients = await getPatientsByProfileId(supabase, profile.id)
    return {
      ok: true,
      patients: patients.map((p) => ({
        id: p.id,
        name: p.name,
        birthDate: p.birth_date,
        responsible: p.responsible,
        contactPhone: p.contact_phone,
      })),
    }
  } catch {
    return { ok: false, error: "Não foi possível carregar os pacientes. Tente de novo." }
  }
}
