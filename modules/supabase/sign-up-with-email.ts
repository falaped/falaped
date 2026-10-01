import type { SupabaseClient } from "@supabase/supabase-js";
import { toDbPhoneFormat } from "@/lib/parsers";

export type SignUpWithEmailPayload = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  emailRedirectTo?: string;
};

/**
 * Registers a new user with email and password.
 * Stores full_name and phone (DB format: 55 + DDD + number) in user_metadata.
 * Use in Client Components: createClient() then signUpWithEmail(supabase, payload).
 * @throws AuthError on sign-up failure
 */
export async function signUpWithEmail(
  supabase: SupabaseClient,
  payload: SignUpWithEmailPayload
): Promise<void> {
  const phone = payload.phone?.trim();
  if (!phone) {
    throw new Error("Telefone é obrigatório");
  }
  const phoneDb = toDbPhoneFormat(phone);

  const { error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName,
        phone: phoneDb,
      },
      emailRedirectTo: payload.emailRedirectTo ?? undefined,
    },
  });
  if (error) throw error;
}
