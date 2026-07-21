import type { SupabaseClient } from "@supabase/supabase-js"
import type { AvailabilityOverrideRow } from "./types"

/** Dados de um override a criar (sem profile_id — stampado server-side). */
export type CreateAvailabilityOverrideData = {
  override_type: "add" | "subtract"
  exception_date: string
  start_minute: number | null
  end_minute: number | null
  slot_minutes: number | null
}

/**
 * Cria um override por data para o médico (modelo híbrido v2, D-20), stampando
 * profile_id server-side (nunca confiar no cliente) — defesa contra IDOR (D-13).
 * ADITIVO (`override_type: "add"`): faixa preenchida + `slot_minutes > 0` (horário
 * extra pontual, AGENDA-05). SUBTRATIVO (`override_type: "subtract"`): faixa null =
 * folga dia inteiro; faixa preenchida = bloqueio parcial (D-04), `slot_minutes`
 * null. Retorna a linha criada com as novas colunas.
 *
 * @param supabase Cliente por-requisição injetado.
 * @param profileId Id do perfil do médico dono.
 * @param input Tipo do override, data, faixa e slot (aditivo) ou nulls (subtrativo).
 */
export async function createAvailabilityOverride(
  supabase: SupabaseClient,
  profileId: string,
  input: CreateAvailabilityOverrideData,
): Promise<AvailabilityOverrideRow> {
  const { data, error } = await supabase
    .from("availability_exceptions")
    .insert({
      profile_id: profileId,
      override_type: input.override_type,
      exception_date: input.exception_date,
      start_minute: input.start_minute,
      end_minute: input.end_minute,
      slot_minutes: input.slot_minutes,
    })
    .select(
      "id, profile_id, exception_date, start_minute, end_minute, override_type, slot_minutes, created_at",
    )
    .single()

  if (error)
    throw new Error(
      `[AVAILABILITY] Failed to create availability override: ${error.message}`,
    )

  return data as AvailabilityOverrideRow
}
