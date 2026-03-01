import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/modules/profiles/types";
import type { AuthenticatedUserRow } from "@/modules/authenticated-users/get-authenticated-user-by-profile-id";

export type { Profile };
export type { AuthenticatedUserRow };

/** Profile merged with the linked authenticated_users row (status, whatsapp_linked_at, etc.). */
export type AuthenticatedUserProfile = Profile & AuthenticatedUserRow;

export type AuthenticatedUserResult = {
  profile: AuthenticatedUserProfile;
};

/**
 * Returns the current authenticated user's profile (merged with authenticated_users row).
 * Always returns { profile }; use `const { profile } = await getAuthenticatedUser(supabase)` then check `if (!profile)`.
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
      "id, auth_user_id, phone, first_name, surname, email, crm, rqe, logo_url_full, logo_url_short, social_media_handle, website, report_template_id, authenticated_users(id, phone, status, profile_id, whatsapp_linked_at)"
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
