import type { SupabaseClient } from "@supabase/supabase-js";

export type UserForDisplay = {
  name: string;
  email: string;
  avatar: string;
};

/**
 * Returns the current user's display data (name, email, avatar) from auth.
 * Use in Client Components: createClient() then getCurrentUserForDisplay(supabase).
 */
export async function getCurrentUserForDisplay(
  supabase: SupabaseClient,
): Promise<UserForDisplay | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    name:
      (user.user_metadata?.full_name as string) ??
      user.email?.split("@")[0] ??
      "Usuário",
    email: user.email ?? "",
    avatar: (user.user_metadata?.avatar_url as string) ?? "",
  };
}
