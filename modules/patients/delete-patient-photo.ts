import type { SupabaseClient } from "@supabase/supabase-js"
import { PATIENT_PHOTOS_BUCKET } from "@/lib/constants"

/**
 * Remove o objeto da foto do paciente do bucket privado `patient-photos`.
 * Idempotente: quando `photoPath` é null/vazio, é um no-op (nada armazenado).
 * Usa o client do USUÁRIO (não service-role) — a RLS de storage permite ao dono
 * remover o próprio objeto (Pitfall 2). Lança erro com tag `[PATIENTS]` apenas
 * em falha real do storage.
 */
export async function deletePatientPhoto(
  supabase: SupabaseClient,
  photoPath: string | null,
): Promise<void> {
  if (!photoPath) return

  const { error } = await supabase.storage
    .from(PATIENT_PHOTOS_BUCKET)
    .remove([photoPath])

  if (error)
    throw new Error(
      `[PATIENTS] Falha ao remover foto do storage: ${error.message}`,
    )
}
