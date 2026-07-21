"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  createAvailabilityExceptionSchema,
  type CreateAvailabilityExceptionInput,
} from "@/lib/schemas/availability"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createAvailabilityException } from "@/modules/availability/create-availability-exception"
import type { AvailabilityExceptionRow } from "@/modules/availability/types"

export type CreateAvailabilityExceptionResult =
  | { ok: true; exception: AvailabilityExceptionRow }
  | { ok: false; error: string }

/**
 * Cria uma exceção subtrativa (folga) do médico: dia inteiro (faixa null) ou
 * bloqueio parcial (faixa preenchida, D-04). Fecha AGENDA-03.
 *
 * Gate auth + paid (T-06-05), depois Zod safeParse (T-06-06: múltiplos de 30,
 * fim > início, nullability coerente — ambos null ou ambos preenchidos). O
 * profile.id é stampado server-side no módulo (T-06-07/D-13). Revalida
 * /dashboard/agenda para a RSC re-expandir a agenda sem a faixa bloqueada.
 */
export async function createAvailabilityExceptionAction(
  input: CreateAvailabilityExceptionInput,
): Promise<CreateAvailabilityExceptionResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = createAvailabilityExceptionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  }

  try {
    const exception = await createAvailabilityException(supabase, profile.id, {
      exception_date: parsed.data.exception_date,
      start_minute: parsed.data.start_minute,
      end_minute: parsed.data.end_minute,
    })
    revalidatePath("/dashboard/agenda")
    return { ok: true, exception }
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Não foi possível salvar a folga. Tente novamente."
    return { ok: false, error: message }
  }
}
