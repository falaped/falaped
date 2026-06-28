"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { uploadPatientPhoto } from "@/modules/patients/upload-patient-photo"
import { updatePatientPhoto } from "@/modules/patients/update-patient-photo"
import { uploadPatientPhotoSchema } from "@/lib/schemas/patient"

export type UploadPatientPhotoResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Faz upload da foto do paciente com porta de autenticação + assinatura paga +
 * consentimento validado no servidor (D-04 / T-02-05). O `consent === true` é
 * checado AQUI via Zod (`uploadPatientPhotoSchema`), não só no cliente. Em todo
 * envio (incl. substituição) regrava `consent_at` (D-06). Persiste só o PATH
 * do objeto, nunca a URL (D-02).
 */
export async function uploadPatientPhotoAction(
  formData: FormData,
): Promise<UploadPatientPhotoResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const patientId = formData.get("patientId")
  const consent = formData.get("consent") === "true"
  const file = formData.get("file")

  const parsed = uploadPatientPhotoSchema.safeParse({ patientId, consent })
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return { ok: false, error: msg }
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione uma imagem." }
  }

  try {
    const path = await uploadPatientPhoto(
      supabase,
      profile.id,
      parsed.data.patientId,
      file,
    )
    await updatePatientPhoto(supabase, parsed.data.patientId, profile.id, {
      photo_path: path,
      consent_given: true,
      consent_at: new Date().toISOString(),
    })
    revalidatePath("/dashboard/patients")
    revalidatePath(`/dashboard/patients/${parsed.data.patientId}`)
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Não foi possível enviar a foto. Tente novamente.",
    }
  }
}
