"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deletePrescriptionsBulk } from "@/modules/prescriptions/delete-prescriptions-bulk"

const bulkItemSchema = z.object({
  id: z.string().uuid(),
  pdfStoragePath: z.string().nullable(),
})

export type DeletePrescriptionsBulkResult =
  | { ok: true; deletedCount: number }
  | { ok: false; error: string }

const MAX_BULK = 100

/**
 * Deletes multiple prescriptions owned by the current profile in a single batched operation.
 * Replaces the per-item for loop with a single DB delete + single storage remove (SEC-04).
 */
export async function deletePrescriptionsBulkAction(
  items: { id: string; pdfStoragePath: string | null }[],
): Promise<DeletePrescriptionsBulkResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }

  const parsed = z.array(bulkItemSchema).safeParse(items)
  if (!parsed.success || parsed.data.length === 0) {
    return { ok: false, error: "Selecione ao menos uma receita." }
  }
  if (parsed.data.length > MAX_BULK) {
    return {
      ok: false,
      error: `Máximo de ${MAX_BULK} receitas por exclusão.`,
    }
  }

  try {
    const { deletedCount } = await deletePrescriptionsBulk(
      supabase,
      parsed.data.map((i) => i.id),
      profile.id,
      parsed.data.map((i) => i.pdfStoragePath),
    )
    revalidatePath("/dashboard/prescriptions")
    return { ok: true, deletedCount }
  } catch (e) {
    console.error("[PRESCRIPTIONS] bulk delete failed", e)
    return {
      ok: false,
      error: "Erro ao excluir receitas. Tente novamente.",
    }
  }
}
