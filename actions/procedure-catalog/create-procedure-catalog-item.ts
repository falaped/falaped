"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  procedureCatalogItemSchema,
  type ProcedureCatalogItemFormValues,
} from "@/lib/schemas/procedure-catalog-item"
import { createProcedureCatalogItem } from "@/modules/procedure-catalog/create-procedure-catalog-item"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type CreateProcedureCatalogItemResult =
  | { ok: true; itemId: string }
  | { ok: false; error: string }

/**
 * Cadastra um procedimento com preço no catálogo do médico (EARN-01, D-04).
 *
 * Gate de autenticação + gate de assinatura ANTES de ler o payload (T-10-17: a RLS
 * `to authenticated` não impõe assinatura). O nome e o preço em reais são validados
 * aqui, no boundary; o módulo recebe centavos inteiros. O `profile_id` é estampado a
 * partir da sessão e nunca vem do cliente.
 */
export async function createProcedureCatalogItemAction(
  data: ProcedureCatalogItemFormValues,
): Promise<CreateProcedureCatalogItemResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = procedureCatalogItemSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  try {
    const itemId = await createProcedureCatalogItem(supabase, profile.id, {
      name: parsed.data.name,
      priceCents: parsed.data.price,
    })
    revalidatePath("/dashboard/profile")
    return { ok: true, itemId }
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Erro ao cadastrar o procedimento. Tente novamente."
    return { ok: false, error: message }
  }
}
