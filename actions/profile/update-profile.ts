"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { updateProfile } from "@/modules/profiles/update-profile"
import {
  updateProfileSchema,
  type UpdateProfileFormData,
} from "@/lib/schemas/profile"

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Updates the current user's profile (first_name, surname, email, crm, rqe, etc.).
 */
export async function updateProfileAction(
  data: UpdateProfileFormData,
): Promise<UpdateProfileResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }

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
    }
    await updateProfile(supabase, profile.id, payload)
    revalidatePath("/dashboard/profile")
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar perfil."
    return { ok: false, error: message }
  }
}
