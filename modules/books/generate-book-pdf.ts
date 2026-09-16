import type { SupabaseClient } from "@supabase/supabase-js"

import { BOOK_ASSETS_BUCKET } from "@/lib/constants"
import { BOOK_PAGE_COUNT, bookPdfPath } from "@/modules/books/constants"
import { buildBookPdf } from "@/modules/books/pdf/build-book-pdf"
import { renderBookText } from "@/modules/books/render-book-text"
import { getBookTheme } from "@/modules/books/themes"
import type { BookWithPages } from "@/modules/books/types"

/**
 * Baixa as 20 ilustrações prontas, monta o PDF e grava em
 * book-assets/{bookId}/book.pdf, atualizando `pdf_path`. Exige todas as
 * páginas `ready`.
 */
export async function generateBookPdf(supabase: SupabaseClient, book: BookWithPages): Promise<string> {
  const ready = book.pages.filter((p) => p.status === "ready" && p.image_path)
  if (ready.length !== BOOK_PAGE_COUNT) {
    const missing = Array.from({ length: BOOK_PAGE_COUNT }, (_, i) => i).filter((i) => !ready.some((p) => p.index === i))
    throw new Error(`[BOOKS] Faltam páginas prontas para o PDF: ${missing.join(", ")}`)
  }

  const storage = supabase.storage.from(BOOK_ASSETS_BUCKET)
  const download = async (path: string) => {
    const { data, error } = await storage.download(path)
    if (error || !data) throw new Error(`[BOOKS] Falha ao baixar ${path}: ${error?.message}`)
    return Buffer.from(await data.arrayBuffer())
  }

  const ordered = [...ready].sort((a, b) => a.index - b.index)
  const pages = await Promise.all(ordered.map((p) => download(p.image_path as string)))
  const logo = book.pediatrician_logo_path ? await download(book.pediatrician_logo_path) : null

  const theme = getBookTheme(book.theme)
  const child = { name: book.child_name, gender: book.child_gender, pediatricianName: book.pediatrician_name }
  const dedication = renderBookText(book.dedication?.trim() || theme.defaultDedication, child)

  const pdf = await buildBookPdf({
    pages,
    childName: book.child_name,
    dedication,
    pediatricianName: book.pediatrician_name,
    pediatricianLogo: logo,
  })

  const path = bookPdfPath(book.id)
  const { error: uploadError } = await storage.upload(path, pdf, { contentType: "application/pdf", upsert: true })
  if (uploadError) throw new Error(`[BOOKS] Falha ao salvar PDF: ${uploadError.message}`)

  const { error } = await supabase
    .from("books")
    .update({ pdf_path: path, updated_at: new Date().toISOString() })
    .eq("id", book.id)
  if (error) throw new Error(`[BOOKS] Falha ao gravar pdf_path: ${error.message}`)
  return path
}
