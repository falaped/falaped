"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  saveAvailabilitySchema,
  type SaveAvailabilityInput,
} from "@/lib/schemas/availability"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type SaveAvailabilityResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Salva em lote (D-17) a disponibilidade do médico: a grade recorrente completa
 * + os overrides adicionados e os removidos, tudo num único fluxo de
 * reconciliação (AGENDA-01/AGENDA-02/AGENDA-03/AGENDA-05).
 *
 * Gate auth + paid (T-06-05), depois Zod safeParse do diff no boundary (T-06-03)
 * antes de delegar.
 *
 * TRANSACIONALIDADE (CR-02): a reconciliação roda numa ÚNICA RPC Postgres
 * (`public.save_availability`) cujo corpo plpgsql é implicitamente atômico —
 * substitui a grade, remove overrides marcados e insere overrides novos ou faz
 * rollback INTEIRO se qualquer statement falhar. Isso substitui os 3 round-trips
 * não-transacionais da v2 anterior (delete+insert de rules, inserts, deletes),
 * que numa falha no meio corrompiam o estado (grade zerada ou overrides
 * divergentes). O profile.id é sempre stampado server-side (nunca confiar no
 * cliente — D-13); a própria RPC re-verifica o dono via auth.uid(). Revalida
 * /dashboard/agenda para a RSC re-expandir os slots na próxima leitura.
 */
export async function saveAvailabilityAction(
  input: SaveAvailabilityInput,
): Promise<SaveAvailabilityResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = saveAvailabilitySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  }

  const { rules, overridesAdd, overridesRemove } = parsed.data

  const { error } = await supabase.rpc("save_availability", {
    p_profile_id: profile.id,
    p_rules: rules,
    p_overrides_add: overridesAdd,
    p_overrides_remove: overridesRemove.map((o) => o.id),
  })

  if (error) {
    return {
      ok: false,
      error:
        error.message ||
        "Não foi possível salvar a disponibilidade. Tente novamente.",
    }
  }

  revalidatePath("/dashboard/agenda")
  return { ok: true }
}
