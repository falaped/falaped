"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  saveAvailabilityRulesSchema,
  type SaveAvailabilityRulesInput,
} from "@/lib/schemas/availability"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { upsertAvailabilityRules } from "@/modules/availability/upsert-availability-rules"

export type SaveAvailabilityRulesResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Salva (SUBSTITUI) a grade semanal inteira de disponibilidade do médico
 * (AGENDA-01/AGENDA-02, D-01/D-02/D-09).
 *
 * Gate auth + paid (T-06-05), depois Zod safeParse da grade no boundary
 * (T-06-06: múltiplos de 30, fim > início) antes de delegar. O profile.id é
 * sempre stampado server-side no módulo (nunca confiar no cliente — T-06-07/D-13).
 * Estratégia delete-then-insert do módulo trata a grade como um todo. Revalida
 * /dashboard/agenda para a RSC re-expandir os slots na próxima leitura.
 */
export async function saveAvailabilityRulesAction(
  input: SaveAvailabilityRulesInput,
): Promise<SaveAvailabilityRulesResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = saveAvailabilityRulesSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  }

  try {
    await upsertAvailabilityRules(supabase, profile.id, parsed.data.rules)
    revalidatePath("/dashboard/agenda")
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Não foi possível salvar a disponibilidade. Tente novamente."
    return { ok: false, error: message }
  }
}
