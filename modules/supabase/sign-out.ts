import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Signs out the current user. Use in Client Components:
 * createClient() then signOut(supabase).
 */
export async function signOut(supabase: SupabaseClient): Promise<void> {
  await supabase.auth.signOut();
}
