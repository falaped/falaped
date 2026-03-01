"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteProfileLogo } from "@/modules/profiles/delete-profile-logo"
import { updateProfile } from "@/modules/profiles/update-profile"

export type ClearProfileLogoResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Clears the profile logo (full or short): removes the file from storage and
 * sets logo_url_full or logo_url_short to null in profiles.
 */
export async function clearProfileLogoAction(
  kind: "full" | "short",
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
