import type { SupabaseClient } from "@supabase/supabase-js"
import { toDbPhoneFormat } from "@/lib/parsers"

/**
 * Resolves the pediatrician's user_phone from the authenticated session.
 * Flow: get phone from auth user metadata (set at signup) → convert to DB format
 * (55 + DDD + number without mobile 9) → verify it exists in authenticated_users
 * with status 'paid'.
 */
export async function getAuthenticatedUserPhone(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const rawPhone = user.user_metadata?.phone as string | undefined
  if (!rawPhone || typeof rawPhone !== "string") return null
  console.log("[AUTH] rawPhone", rawPhone)

  const phoneDb = toDbPhoneFormat(rawPhone)

  const { data: authenticatedUser } = await supabase
    .from("authenticated_users")
    .select("phone")
    .eq("phone", phoneDb)
    .eq("status", "paid")
    .maybeSingle()

  return authenticatedUser?.phone ?? null
}