import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/modules/profiles/types";

export type { Profile };

/** Profile merged with the linked authenticated_users row (status, whatsapp_linked_at, etc.). */
export type AuthenticatedUserProfile = Profile & AuthenticatedUserRow;

export type AuthenticatedUserResult = {
  profile: AuthenticatedUserProfile;
};



export type AuthenticatedUserRow = {
  id: string
  phone: string | null
  status: string
  profile_id: string
  whatsapp_linked_at: string | null
  linked_phone_status: boolean
}


/**
 * Returns the current authenticated user's profile (merged with authenticated_users row).
 *
 * Always returns `{ profile }` — and when there is no session (or no profile row) that
 * `profile` is an EMPTY OBJECT cast to the profile type, never `undefined`. So:
 *
 * ```ts
 * const { profile } = await getAuthenticatedUser(supabase)
 * if (!profile?.id) return { ok: false, error: "Sessão não encontrada." } // correto
 * ```
 *
 * `if (!profile)` NÃO funciona: `{}` é truthy, o branch nunca dispara e o único gate que
 * sobra é o `status !== "paid"` da linha seguinte, por acidente. Sempre checar `profile?.id`.
 */
export async function getAuthenticatedUser(
  supabase: SupabaseClient
): Promise<AuthenticatedUserResult> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return { profile: {} as AuthenticatedUserProfile };

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, auth_user_id, phone, first_name, surname, email, crm, rqe, logo_url_full, logo_url_short, social_media_handle, website, report_template_id, default_location_state, default_location_city, consultation_price_cents, authenticated_users(id, phone, status, profile_id, whatsapp_linked_at, linked_phone_status)"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError)
    throw new Error(`[SUPABASE] Failed to get profile: ${profileError.message}`);
  if (!profileData) return { profile: {} as AuthenticatedUserProfile };

  const { authenticated_users: embedded, ...profileFields } = profileData;
  const row = embedded?.[0];
  const profile: AuthenticatedUserProfile = {
    ...profileFields,
    ...(row ?? {}),
    id: profileFields.id,
  } as AuthenticatedUserProfile;

  return { profile };
}
