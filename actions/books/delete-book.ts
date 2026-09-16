"use server"

import { revalidatePath } from "next/cache"

import { requireBook } from "@/actions/books/require-book"
import type { BookActionResult } from "@/actions/books/generate-cover"
import { deleteBook } from "@/modules/books/delete-book"

/** Exclui o livro e todos os arquivos (fotos, páginas, PDF). Irreversível. */
export async function deleteBookAction(bookId: string): Promise<BookActionResult> {
  const ctx = await requireBook(bookId)
  if ("ok" in ctx) return ctx
  try {
    await deleteBook(ctx.admin, ctx.profileId, bookId)
    revalidatePath("/books")
    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao excluir livro." }
  }
}
