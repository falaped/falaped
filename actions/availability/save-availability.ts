"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  saveAvailabilitySchema,
  type SaveAvailabilityInput,
} from "@/lib/schemas/availability"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { upsertAvailabilityRules } from "@/modules/availability/upsert-availability-rules"
import { createAvailabilityOverride } from "@/modules/availability/create-availability-override"
import { deleteAvailabilityOverride } from "@/modules/availability/delete-availability-override"

export type SaveAvailabilityResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Salva em lote (D-17) a disponibilidade do médico: a grade recorrente completa
 * + os overrides adicionados e os removidos, tudo num único fluxo de
 * reconciliação (AGENDA-01/AGENDA-02/AGENDA-03/AGENDA-05).
 *
 * Gate auth + paid (T-06-05), depois Zod safeParse do diff no boundary (T-06-03)
 * antes de delegar. O profile.id é sempre stampado server-side nos módulos
 * (nunca confiar no cliente — D-13). Reconciliação: (1) substitui a grade
 * recorrente via delete-then-insert; (2) cria cada override aditivo/subtrativo;
 * (3) remove cada override por id (scoped profile_id + id). Revalida
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

  try {
    // (1) Substitui a grade recorrente completa (delete-then-insert).
    await upsertAvailabilityRules(supabase, profile.id, parsed.data.rules)

    // (2) Cria os overrides adicionados (aditivos carregam slot_minutes próprio;
    // subtrativos deixam slot_minutes null).
    for (const override of parsed.data.overridesAdd) {
      await createAvailabilityOverride(supabase, profile.id, {
        override_type: override.override_type,
        exception_date: override.exception_date,
        start_minute: override.start_minute,
        end_minute: override.end_minute,
        slot_minutes: override.slot_minutes,
      })
    }

    // (3) Remove os overrides marcados (double-scoped profile_id + id no módulo).
    for (const { id } of parsed.data.overridesRemove) {
      await deleteAvailabilityOverride(supabase, profile.id, id)
    }

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
