import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { env } from "@/lib/env"
import { getBook } from "@/modules/books/get-book"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import type { BookWithPages } from "@/modules/books/types"

export type BookActionError = { ok: false; error: string }
export type BookActionResult = { ok: true } | BookActionError

export type BookContext = {
  /** Service role: books/book_pages/book-assets não têm policies. Sempre escopar por profile_id. */
  admin: ReturnType<typeof createAdminClient>
  profileId: string
  book: BookWithPages
  replicateToken: string | null
}

/**
 * Gate padrão (sessão + status paid) e carrega o livro do usuário via service
 * role. Devolve o erro já no formato de resultado das actions.
 */
export async function requireBook(bookId: string): Promise<BookContext | BookActionError> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") return { ok: false, error: "Perfil não ativo." }

  const admin = createAdminClient()
  const book = await getBook(admin, profile.id, bookId)
  if (!book) return { ok: false, error: "Livro não encontrado." }
  return { admin, profileId: profile.id, book, replicateToken: env.REPLICATE_API_TOKEN ?? null }
}
