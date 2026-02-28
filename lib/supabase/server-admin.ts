import { createClient } from "@supabase/supabase-js"

/**
 * Server-only Supabase client with service role. Use only for admin operations
 * (e.g. auth.admin.deleteUser). Never expose this client or the service role key to the browser.
 * Requires SUPABASE_SERVICE_ROLE_KEY in env.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      "[SUPABASE] SUPABASE_SERVICE_ROLE_KEY is required for admin operations."
    )
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false } }
  )
}
