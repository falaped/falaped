import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Atualiza os campos de foto/consentimento do paciente, escopado por
 * `.eq("id", patientId).eq("profile_id", profileId)` — o backstop de IDOR
 * (T-02-06 / Pitfall 3: o app não tem RLS de tabela por padrão). O `profileId`
 * vem da action, nunca confiar apenas no `patientId` enviado pelo cliente.
 */
export async function updatePatientPhoto(
  supabase: SupabaseClient,
  patientId: string,
  profileId: string,
  fields: {
    photo_path: string | null
    consent_given: boolean
    consent_at: string | null
  },
): Promise<void> {
  const { error } = await supabase
    .from("patients")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", patientId)
    .eq("profile_id", profileId)

  if (error)
    throw new Error(`[PATIENTS] Failed to update patient photo: ${error.message}`)
}
