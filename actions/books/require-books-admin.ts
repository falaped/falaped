import { env } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

/** Gate padrão (sessão + paid) mais e-mail em BOOKS_ADMIN_EMAILS. Devolve o profile id ou o erro. */
export async function requireBooksAdmin(): Promise<{ ok: true; profileId: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") return { ok: false, error: "Perfil não ativo." }
  if (!profile.email || !env.BOOKS_ADMIN_EMAILS.includes(profile.email.toLowerCase()))
    return {
      ok: false,
      error: `Sem acesso aos pedidos: ${profile.email ?? "perfil sem e-mail"} não está em BOOKS_ADMIN_EMAILS (${env.BOOKS_ADMIN_EMAILS.length} e-mail(s) configurado(s)).`,
    }
  return { ok: true, profileId: profile.id }
}
