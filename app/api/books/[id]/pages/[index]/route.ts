import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { getBook } from "@/modules/books/get-book"
import { getBookAssetSignedUrl } from "@/modules/books/get-book-asset-signed-url"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

/**
 * GET /api/books/[id]/pages/[index]
 * Redireciona para uma signed URL curta da ilustração, se o livro é do usuário.
 * Bucket sem policies: leitura via service role após checar profile_id.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const { id, index } = await params
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return Response.json({ error: "Não autorizado" }, { status: 401 })
  if (profile.status !== "paid") return Response.json({ error: "Perfil não ativo." }, { status: 403 })

  const admin = createAdminClient()
  const book = await getBook(admin, profile.id, id)
  const page = book?.pages.find((p) => p.index === Number(index))
  if (!page?.image_path) return Response.json({ error: "Página não encontrada" }, { status: 404 })

  const url = await getBookAssetSignedUrl(admin, page.image_path)
  if (!url) return Response.json({ error: "Erro ao gerar link" }, { status: 500 })
  return Response.redirect(url, 302)
}
