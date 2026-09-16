import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { getBook } from "@/modules/books/get-book"
import { getBookAssetSignedUrl } from "@/modules/books/get-book-asset-signed-url"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

/** GET /api/books/[id]/pdf — redireciona para signed URL curta do PDF do livro do usuário. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return Response.json({ error: "Não autorizado" }, { status: 401 })
  if (profile.status !== "paid") return Response.json({ error: "Perfil não ativo." }, { status: 403 })

  const admin = createAdminClient()
  const book = await getBook(admin, profile.id, id)
  if (!book?.pdf_path) return Response.json({ error: "PDF não disponível" }, { status: 404 })

  const url = await getBookAssetSignedUrl(admin, book.pdf_path)
  if (!url) return Response.json({ error: "Erro ao gerar link" }, { status: 500 })
  return Response.redirect(url, 302)
}
