"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import {
  procedureCatalogItemSchema,
  type ProcedureCatalogItemFormValues,
} from "@/lib/schemas/procedure-catalog-item"
import { updateProcedureCatalogItem } from "@/modules/procedure-catalog/update-procedure-catalog-item"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type UpdateProcedureCatalogItemResult =
  | { ok: true }
  | { ok: false; error: string }

const itemIdSchema = z.string().uuid("Procedimento inválido.")

/**
 * Renomeia ou reajusta o preço de um procedimento do catálogo (EARN-01, D-04).
 *
 * Gate de autenticação + gate de assinatura antes de qualquer escrita (T-10-17). O id
 * vem do cliente e é dado NÃO confiável: o módulo filtra por id E por profile_id
 * (T-10-16). Reajustar o preço não reescreve faturamento já gravado (snapshot, D-05).
 */
export async function updateProcedureCatalogItemAction(
  id: string,
  data: ProcedureCatalogItemFormValues,
): Promise<UpdateProcedureCatalogItemResult> {
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

  const parsed = procedureCatalogItemSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  try {
    await updateProcedureCatalogItem(supabase, parsedId.data, profile.id, {
      name: parsed.data.name,
      priceCents: parsed.data.price,
    })
    revalidatePath("/dashboard/profile")
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Erro ao atualizar o procedimento. Tente novamente."
    return { ok: false, error: message }
  }
}
