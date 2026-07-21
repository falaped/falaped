import type { SupabaseClient } from "@supabase/supabase-js"
import type { AvailabilityExceptionRow } from "./types"

/** Dados de uma exceção a criar (sem profile_id — stampado server-side). */
export type CreateAvailabilityExceptionData = {
  exception_date: string
  start_minute: number | null
  end_minute: number | null
}

/**
 * Cria uma exceção subtrativa para o médico, stampando profile_id server-side
 * (nunca confiar no cliente) — defesa contra IDOR (D-13). Faixa null = dia
 * inteiro; faixa preenchida = bloqueio parcial (D-04). Retorna a linha criada.
 *
 * @param supabase Cliente por-requisição injetado.
 * @param profileId Id do perfil do médico dono.
 * @param input Data da exceção e faixa (ambos null ou ambos preenchidos).
 */
export async function createAvailabilityException(
  supabase: SupabaseClient,
  profileId: string,
  input: CreateAvailabilityExceptionData,
): Promise<AvailabilityExceptionRow> {
  const { data, error } = await supabase
    .from("availability_exceptions")
    .insert({
      profile_id: profileId,
      exception_date: input.exception_date,
      start_minute: input.start_minute,
      end_minute: input.end_minute,
    })
    .select("id, profile_id, exception_date, start_minute, end_minute, created_at")
    .single()

  if (error)
    throw new Error(
      `[AVAILABILITY] Failed to create availability exception: ${error.message}`,
    )

  return data as AvailabilityExceptionRow
}
