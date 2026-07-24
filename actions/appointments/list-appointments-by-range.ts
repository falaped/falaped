"use server"

import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import {
  listAppointmentsByProfileId,
  type AppointmentListRow,
} from "@/modules/appointments/list-appointments-by-profile-id"

export type ListAppointmentsByRangeResult =
  | { ok: true; appointments: AppointmentListRow[] }
  | { ok: false; error: string }

/**
 * Schema inline do boundary: janela `[fromIso, toIso)` meio-aberta em ISO
 * datetime (UTC), espelhando o estilo de lib/schemas/appointment.ts. O `.refine`
 * garante que o fim é posterior ao início.
 */
const listAppointmentsByRangeSchema = z
  .object({
    fromIso: z.string().datetime({ message: "Início da janela inválido." }),
    toIso: z.string().datetime({ message: "Fim da janela inválido." }),
  })
  .refine((input) => new Date(input.fromIso) < new Date(input.toIso), {
    message: "O fim da janela deve ser posterior ao início.",
    path: ["toIso"],
  })

/**
 * Busca as consultas da JANELA visível conforme a navegação da agenda
 * (dia/semana/mês), reusando o módulo profile-scoped listAppointmentsByProfileId.
 * Complementa o load inicial da semana feito no RSC (app/dashboard/agenda/page.tsx):
 * o cliente re-busca esta faixa ao navegar e após criar/transitar uma consulta.
 *
 * Gate auth + paid (a RLS `to authenticated` NÃO impõe a assinatura — regra de
 * app). Zod safeParse no boundary. O escopo é SEMPRE `profile.id` do servidor —
 * NUNCA aceitar profile/id do cliente (defesa contra IDOR). Retorna rows CRUAS
 * (a projeção AppointmentListRow); o enriquecimento com nome/responsável é do
 * cliente. NÃO chama revalidatePath/next/cache.
 */
export async function listAppointmentsByRangeAction(
  fromIso: string,
  toIso: string,
): Promise<ListAppointmentsByRangeResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = listAppointmentsByRangeSchema.safeParse({ fromIso, toIso })
  if (!parsed.success) {
    return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  }

  try {
    const rows = await listAppointmentsByProfileId(
      supabase,
      profile.id,
      new Date(parsed.data.fromIso),
      new Date(parsed.data.toIso),
    )
    return { ok: true, appointments: rows }
  } catch {
    return {
      ok: false,
      error: "Não foi possível carregar as consultas. Atualize a agenda e tente novamente.",
    }
  }
}
