"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { updateProfile } from "@/modules/profiles/update-profile"
import {
  uploadProfileLogo,
  type UploadProfileLogoKind,
} from "@/modules/profiles/upload-profile-logo"

export type UploadProfileLogoResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

/**
 * Uploads a profile logo (full or short) and updates the profile with the new URL.
 */
export async function uploadProfileLogoAction(
  formData: FormData,
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
