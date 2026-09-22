
import { notFound } from "next/navigation"
import type { SupabaseClient } from "@supabase/supabase-js"

import { isAdminEmail } from "@/lib/admin"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"

/**
 * Gate do painel admin: o e-mail vem da SESSÃO (`auth.getUser`), nunca de `profiles.email`,
 * que é campo editável pelo próprio usuário. Não sendo admin, a rota simplesmente não existe.
 *
 * Devolve o client de service role porque o painel lê dados de TODOS os perfis — o client
 * normal esbarraria na RLS por `profile_id`.
 */
export async function requireAdmin(): Promise<SupabaseClient> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!isAdminEmail(data.user?.email)) notFound()
  return createAdminClient()
}
