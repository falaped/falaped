"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteMedicalCertificate } from "@/modules/medical-certificates/delete-medical-certificate"

export type DeleteMedicalCertificateResult =
  | { ok: true }
  | { ok: false; error: string }

export async function deleteMedicalCertificateAction(
  certificateId: string,
  pdfStoragePath: string | null,
): Promise<DeleteMedicalCertificateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }

  if (!certificateId || typeof certificateId !== "string")
    return { ok: false, error: "ID do atestado inválido." }

  try {
    let storageClient: Awaited<ReturnType<typeof createAdminClient>> | undefined
    try {
      storageClient = createAdminClient()
    } catch {
      // SUPABASE_SERVICE_ROLE_KEY not set; use user client for storage (may fail with RLS)
    }
    await deleteMedicalCertificate(
      supabase,
      certificateId,
      pdfStoragePath,
      storageClient,
    )
    revalidatePath("/dashboard/medical-certificates")
    return { ok: true }
  } catch (e) {
    console.error("[MEDICAL_CERTIFICATES] delete failed", e)
    return {
      ok: false,
      error: "Erro ao excluir atestado. Tente novamente.",
    }
  }
}
