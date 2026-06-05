"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteMedicalCertificatesBulk } from "@/modules/medical-certificates/delete-medical-certificates-bulk"

const bulkItemSchema = z.object({
  id: z.string().uuid(),
  pdfStoragePath: z.string().nullable(),
})

export type DeleteMedicalCertificatesBulkResult =
  | { ok: true; deletedCount: number }
  | { ok: false; error: string }

const MAX_BULK = 100

/**
 * Deletes multiple medical certificates owned by the current profile in a single batched operation.
 * Replaces the per-item for loop with a single DB delete + single storage remove (SEC-04).
 */
export async function deleteMedicalCertificatesBulkAction(
  items: { id: string; pdfStoragePath: string | null }[],
): Promise<DeleteMedicalCertificatesBulkResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }

  const parsed = z.array(bulkItemSchema).safeParse(items)
  if (!parsed.success || parsed.data.length === 0) {
    return { ok: false, error: "Selecione ao menos um atestado." }
  }
  if (parsed.data.length > MAX_BULK) {
    return {
      ok: false,
      error: `Máximo de ${MAX_BULK} atestados por exclusão.`,
    }
  }

  try {
    const { deletedCount } = await deleteMedicalCertificatesBulk(
      supabase,
      parsed.data.map((i) => i.id),
      profile.id,
      parsed.data.map((i) => i.pdfStoragePath),
    )
    revalidatePath("/dashboard/medical-certificates")
    return { ok: true, deletedCount }
  } catch (e) {
    console.error("[MEDICAL_CERTIFICATES] bulk delete failed", e)
    return {
      ok: false,
      error: "Erro ao excluir atestados. Tente novamente.",
    }
  }
}
