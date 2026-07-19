"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteMedicalReport } from "@/modules/medical-reports/delete-medical-report"

export type DeleteMedicalReportResult =
  | { ok: true }
  | { ok: false; error: string }

export async function deleteMedicalReportAction(
  medicalReportId: string,
  pdfStoragePath: string | null,
): Promise<DeleteMedicalReportResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  if (!medicalReportId || typeof medicalReportId !== "string")
    return { ok: false, error: "ID do relatório inválido." }

  try {
    await deleteMedicalReport(
      supabase,
      medicalReportId,
      profile.id,
      pdfStoragePath,
    )
    revalidatePath("/dashboard/medical-reports")
    return { ok: true }
  } catch (e) {
    console.error("[MEDICAL_REPORTS] delete failed", e)
    return {
      ok: false,
      error: "Erro ao excluir relatório. Tente novamente.",
    }
  }
}
