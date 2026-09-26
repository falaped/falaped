import type { SupabaseClient } from "@supabase/supabase-js"

import { isAdminEmail } from "@/lib/admin"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"

/**
 * Gate das actions do painel admin: mesmo critério de `requireAdmin` (e-mail da sessão),
 * mas devolve um result union em vez de `notFound()`, que dentro de uma action vira erro cru.
 */
export async function requireAdminAction(): Promise<
  { ok: true; admin: SupabaseClient } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!isAdminEmail(data.user?.email)) return { ok: false, error: "Sem acesso ao painel admin." }
  return { ok: true, admin: createAdminClient() }
}
