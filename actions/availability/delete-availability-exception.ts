"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteAvailabilityException } from "@/modules/availability/delete-availability-exception"

/** Exclusão de uma folga — só o id; o profile.id é stampado server-side (D-13). */
const deleteAvailabilityExceptionSchema = z.object({
  id: z.string().uuid("Identificador da folga inválido."),
})

export type DeleteAvailabilityExceptionInput = z.infer<
  typeof deleteAvailabilityExceptionSchema
>

export type DeleteAvailabilityExceptionResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Exclui uma folga do médico (AGENDA-03). Gate auth + paid (T-06-05), depois
 * Zod safeParse do id (uuid). O módulo escopa a exclusão por AMBOS profile_id e
 * id — backstop de ownership contra IDOR (T-06-07/D-13); nunca deletar por id
 * sozinho. Idempotente: excluir uma folga inexistente é no-op. Revalida
 * /dashboard/agenda para a RSC voltar o dia à disponibilidade recorrente.
 */
export async function deleteAvailabilityExceptionAction(
  input: DeleteAvailabilityExceptionInput,
): Promise<DeleteAvailabilityExceptionResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = deleteAvailabilityExceptionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  }

  try {
    await deleteAvailabilityException(supabase, profile.id, parsed.data.id)
    revalidatePath("/dashboard/agenda")
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Não foi possível excluir a folga. Tente novamente."
    return { ok: false, error: message }
  }
}
