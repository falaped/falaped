"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { deleteProcedureCatalogItem } from "@/modules/procedure-catalog/delete-procedure-catalog-item"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type DeleteProcedureCatalogItemResult =
  | { ok: true }
  | { ok: false; error: string }

const itemIdSchema = z.string().uuid("Procedimento inválido.")

/**
 * Remove um procedimento do catálogo (EARN-01, D-04).
 *
 * Gate de autenticação + gate de assinatura antes da escrita (T-10-17). O id vem do
 * cliente e é dado NÃO confiável: o módulo filtra por id E por profile_id (T-10-16).
 * Não apaga faturamento — cada lançamento guardou nome e centavos por snapshot (D-05).
 */
export async function deleteProcedureCatalogItemAction(
  id: string,
): Promise<DeleteProcedureCatalogItemResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsedId = itemIdSchema.safeParse(id)
  if (!parsedId.success) {
    return { ok: false, error: parsedId.error.issues[0]?.message ?? "Dados inválidos." }
  }

  try {
    await deleteProcedureCatalogItem(supabase, parsedId.data, profile.id)
    revalidatePath("/dashboard/profile")
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Erro ao remover o procedimento. Tente novamente."
    return { ok: false, error: message }
  }
}
