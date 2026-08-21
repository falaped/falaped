"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { updateProfile } from "@/modules/profiles/update-profile"
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from "@/lib/schemas/profile"

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Updates the current user's profile (first_name, surname, email, crm, rqe, etc.).
 *
 * Recebe os valores CRUS do form (strings) e é a fonte da verdade da validação — o
 * cliente pode ter rodado o schema, mas o que sobe é o que o usuário digitou. Enviar o
 * dado já transformado significaria parsear duas vezes: o transform de "vazio vira
 * undefined" reprovava no segundo passe (`expected string, received undefined`) e
 * qualquer campo em branco fazia o salvamento inteiro voltar "Dados inválidos.".
 *
 * Deliberadamente SEM gate de assinatura: Perfil é onde o usuário não-pago conclui a
 * conta, e um gate aqui trava o onboarding.
 */
export async function updateProfileAction(
  data: UpdateProfileFormValues,
): Promise<UpdateProfileResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  // `!profile` nunca dispara: getAuthenticatedUser devolve `{}` (truthy) sem sessão.
  // Aqui isso importa mais que nos irmãos porque esta action NÃO tem gate `paid` —
  // por decisão (um perfil sem assinatura precisa poder ser completado) — então não
  // existe a segunda checagem que salva os outros call sites (WR-08).
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }

  const parsed = updateProfileSchema.safeParse(data)
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error)
    const msg = Object.values(fieldErrors).flat().find(Boolean)
    return { ok: false, error: msg ?? "Dados inválidos." }
  }

  try {
    const payload = {
      first_name: parsed.data.first_name ?? null,
      surname: parsed.data.surname ?? null,
      email: parsed.data.email ?? null,
      crm: parsed.data.crm ?? null,
      rqe: parsed.data.rqe ?? null,
      social_media_handle: parsed.data.social_media_handle ?? null,
      website: parsed.data.website ?? null,
      report_template_id: parsed.data.report_template_id ?? null,
      default_location_state: parsed.data.default_location_state ?? null,
      default_location_city: parsed.data.default_location_city ?? null,
      consultation_price_cents: parsed.data.consultation_price_cents ?? null,
    }
    await updateProfile(supabase, profile.id, payload)
    revalidatePath("/dashboard/profile")
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar perfil."
    return { ok: false, error: message }
  }
}
