"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import {
  updateAuthenticatedUserStatus,
  type AuthenticatedUserStatus,
} from "@/modules/authenticated-users/update-authenticated-user-status"
import { deleteProfileLogo } from "@/modules/profiles/delete-profile-logo"
import { updateProfile } from "@/modules/profiles/update-profile"
import {
  uploadProfileLogo,
  type UploadProfileLogoKind,
} from "@/modules/profiles/upload-profile-logo"
import {
  updateProfileSchema,
  type UpdateProfileFormData,
} from "@/lib/schemas/profile"

export type DeleteAccountResult = { ok: true } | { ok: false; error: string }

export type UpdateStatusResult =
  | { ok: true }
  | { ok: false; error: string }

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: string }

export type UploadProfileLogoResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

export type ClearProfileLogoResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Updates the current user's authenticated_users.status (paid | unpaid | blocked).
 * Resolves profile from session; only updates the row linked to the current user.
 */
export async function updateStatusAction(
  status: AuthenticatedUserStatus
): Promise<UpdateStatusResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }

  try {
    await updateAuthenticatedUserStatus(supabase, profile.id, status)
    revalidatePath("/dashboard/profile")
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar status."
    return { ok: false, error: message }
  }
}

/**
 * Updates the current user's profile (first_name, surname, email, crm, rqe).
 * Resolves profile from session; only updates the row linked to the current user.
 */
export async function updateProfileAction(
  data: UpdateProfileFormData
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
    }
    await updateProfile(supabase, profile.id, payload)
    revalidatePath("/dashboard/profile")
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar perfil."
    return { ok: false, error: message }
  }
}

/**
 * Uploads a profile logo (full or short) and updates the profile with the new URL.
 */
export async function uploadProfileLogoAction(
  formData: FormData
): Promise<UploadProfileLogoResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }

  const kind = formData.get("kind") as UploadProfileLogoKind | null
  if (kind !== "full" && kind !== "short") {
    return { ok: false, error: "Tipo de logo inválido." }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione uma imagem." }
  }

  try {
    const url = await uploadProfileLogo(supabase, profile.id, file, kind)
    await updateProfile(supabase, profile.id, {
      [kind === "full" ? "logo_url_full" : "logo_url_short"]: url,
    })
    revalidatePath("/dashboard/profile")
    return { ok: true, url }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao enviar logo."
    return { ok: false, error: message }
  }
}

/**
 * Clears the profile logo (full or short): removes the file from storage and
 * sets logo_url_full or logo_url_short to null in profiles.
 */
export async function clearProfileLogoAction(
  kind: "full" | "short"
): Promise<ClearProfileLogoResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }

  try {
    await deleteProfileLogo(supabase, profile.id, kind)
    await updateProfile(supabase, profile.id, {
      [kind === "full" ? "logo_url_full" : "logo_url_short"]: null,
    })
    revalidatePath("/dashboard/profile")
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao remover logo."
    return { ok: false, error: message }
  }
}

/**
 * Permanently deletes the current user's account. Cascade trigger removes
 * profile, authenticated_users, cases, case_messages, patients, etc.
 * Requires SUPABASE_SERVICE_ROLE_KEY. Caller should redirect to /auth/login on ok: true.
 */
export async function deleteMyAccountAction(): Promise<DeleteAccountResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) {
    return { ok: false, error: "Sessão não encontrada." }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(profile.auth_user_id)
    if (error) {
      return { ok: false, error: error.message }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao excluir conta."
    return { ok: false, error: message }
  }

  return { ok: true }
}
