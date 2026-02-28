import type { SupabaseClient } from "@supabase/supabase-js";

export type SignUpWithEmailPayload = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  emailRedirectTo?: string;
};

/**
 * Registers a new user with email and password.
 * Passes full_name and phone to user_metadata (options.data).
 * Use in Client Components: createClient() then signUpWithEmail(supabase, payload).
 * @throws AuthError on sign-up failure
 */
export async function signUpWithEmail(
  supabase: SupabaseClient,
  payload: SignUpWithEmailPayload
): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: { full_name: payload.fullName, phone: payload.phone },
      emailRedirectTo: payload.emailRedirectTo ?? undefined,
    },
  });
  if (error) throw error;
}
