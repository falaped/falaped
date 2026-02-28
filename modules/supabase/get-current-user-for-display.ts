import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfileByAuthUserId } from "@/modules/profiles/get-profile-by-auth-user-id";

export type UserForDisplay = {
  name: string;
  email: string;
  avatar: string;
};

/**
 * Returns the current user's display data (name from profile or auth metadata, email, avatar).
 * Use in Client Components: createClient() then getCurrentUserForDisplay(supabase).
 */
export async function getCurrentUserForDisplay(
  supabase: SupabaseClient
): Promise<UserForDisplay | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await getProfileByAuthUserId(supabase, user.id);
  const nameFromProfile =
    profile?.first_name || profile?.surname
      ? [profile.first_name, profile.surname].filter(Boolean).join(" ").trim()
      : null;

  return {
    name:
      nameFromProfile ??
      (user.user_metadata?.full_name as string) ??
      user.email?.split("@")[0] ??
      "Usuário",
    email: profile?.email ?? user.email ?? "",
    avatar: (user.user_metadata?.avatar_url as string) ?? "",
  };
}
