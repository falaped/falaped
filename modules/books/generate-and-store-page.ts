import type { SupabaseClient } from "@supabase/supabase-js"

import { BOOK_ASSETS_BUCKET } from "@/lib/constants"
import { bookPagePath } from "@/modules/books/constants"
import { buildPagePrompt } from "@/modules/books/prompts/build-page-prompt"
import { generateImage } from "@/modules/books/replicate/generate-image"
import { getBookTheme } from "@/modules/books/themes"
import type { Book, BookPage } from "@/modules/books/types"

const SIGNED_URL_SECONDS = 15 * 60

/**
 * Gera uma página (0..19) e grava em book_pages. Fotos e páginas-âncora vão
 * ao modelo como signed URLs do bucket privado. Se a geração falhar, a página
 * fica `failed` com o erro, e a função relança para o chamador decidir.
 */
export async function generateAndStorePage(
  supabase: SupabaseClient,
  book: Book,
  index: number,
  replicateToken: string,
): Promise<BookPage> {
  const theme = getBookTheme(book.theme)
  const child = { name: book.child_name, gender: book.child_gender }
  const { prompt, refIndexes } = buildPagePrompt({ theme, child, index })
  const storage = supabase.storage.from(BOOK_ASSETS_BUCKET)

  await supabase
    .from("book_pages")
    .upsert({ book_id: book.id, index, status: "pending", error: null, prompt, updated_at: new Date().toISOString() })

  try {
    const refPaths = refIndexes.map((i) => bookPagePath(book.id, i))
    const { data: signed, error: signError } = await storage.createSignedUrls(
      [...book.photo_paths, ...refPaths],
      SIGNED_URL_SECONDS,
    )
    if (signError) throw new Error(`[BOOKS] Falha ao assinar referências: ${signError.message}`)
    const missing = (signed ?? []).find((s) => !s.signedUrl)
    if (missing) throw new Error(`[BOOKS] Referência ausente: ${missing.path ?? "?"} (gere a capa e as âncoras antes)`)
    const imageUrls = (signed ?? []).flatMap((s) => (s.signedUrl ? [s.signedUrl] : []))

    const png = await generateImage({ prompt, imageUrls, quality: book.quality }, { token: replicateToken })

    const path = bookPagePath(book.id, index)
    const { error: uploadError } = await storage.upload(path, png, { contentType: "image/png", upsert: true })
    if (uploadError) throw new Error(`[BOOKS] Falha ao salvar imagem: ${uploadError.message}`)

    const row = { book_id: book.id, index, image_path: path, status: "ready", error: null, prompt, updated_at: new Date().toISOString() }
    const { error } = await supabase.from("book_pages").upsert(row)
    if (error) throw new Error(`[BOOKS] Falha ao gravar página: ${error.message}`)
    return row as BookPage
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabase
      .from("book_pages")
      .upsert({ book_id: book.id, index, status: "failed", error: message.slice(0, 500), prompt, updated_at: new Date().toISOString() })
    throw err
  }
}
