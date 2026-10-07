import type { SupabaseClient } from "@supabase/supabase-js";
import { toDbPhoneFormat } from "@/lib/parsers";

export type SignUpWithEmailPayload = {
  email: string;
  password: string;
  firstName: string;
  surname: string;
  crm: string;
  phone: string;
  emailRedirectTo?: string;
};

/**
 * Registers a new user with email and password.
 * Stores full_name and phone (DB format: 55 + DDD + number) in user_metadata, which the
 * handle_new_auth_user trigger reads. first_name, surname and crm also go in the metadata
 * and reach the profile on the first dashboard visit (see applySignupMetadata).
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
        full_name: `${payload.firstName} ${payload.surname}`,
        first_name: payload.firstName,
        surname: payload.surname,
        crm: payload.crm,
        phone: phoneDb,
      },
      emailRedirectTo: payload.emailRedirectTo ?? undefined,
    },
  });
  if (error) throw error;
}
