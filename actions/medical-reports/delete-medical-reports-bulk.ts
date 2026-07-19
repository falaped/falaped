"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteMedicalReportsBulk } from "@/modules/medical-reports/delete-medical-reports-bulk"

const bulkItemSchema = z.object({
  id: z.string().uuid(),
  pdfStoragePath: z.string().nullable(),
})

export type DeleteMedicalReportsBulkResult =
  | { ok: true; deletedCount: number }
  | { ok: false; error: string }

const MAX_BULK = 100

/**
 * Deletes multiple medical reports owned by the current profile in a single batched operation.
 */
export async function deleteMedicalReportsBulkAction(
  items: { id: string; pdfStoragePath: string | null }[],
): Promise<DeleteMedicalReportsBulkResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = z.array(bulkItemSchema).safeParse(items)
  if (!parsed.success || parsed.data.length === 0) {
    return { ok: false, error: "Selecione ao menos um relatório." }
  }
  if (parsed.data.length > MAX_BULK) {
    return {
      ok: false,
      error: `Máximo de ${MAX_BULK} relatórios por exclusão.`,
    }
  }

  try {
    const { deletedCount } = await deleteMedicalReportsBulk(
      supabase,
      parsed.data.map((i) => i.id),
      profile.id,
      parsed.data.map((i) => i.pdfStoragePath),
    )
    revalidatePath("/dashboard/medical-reports")
    return { ok: true, deletedCount }
  } catch (e) {
    console.error("[MEDICAL_REPORTS] bulk delete failed", e)
    return {
      ok: false,
      error: "Erro ao excluir relatórios. Tente novamente.",
    }
  }
}
