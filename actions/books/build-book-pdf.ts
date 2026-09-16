"use server"

import { revalidatePath } from "next/cache"

import { requireBook, type BookActionResult } from "@/actions/books/require-book"
import { generateBookPdf } from "@/modules/books/generate-book-pdf"

/** Monta o PDF com as 20 páginas prontas e grava em book-assets. */
export async function buildBookPdfAction(bookId: string): Promise<BookActionResult> {
  const ctx = await requireBook(bookId)
  if ("ok" in ctx) return ctx
  try {
    await generateBookPdf(ctx.admin, ctx.book)
    revalidatePath(`/books/${bookId}`)
    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao gerar PDF." }
  }
}
