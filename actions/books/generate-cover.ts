"use server"

import { revalidatePath } from "next/cache"

import { requireBook } from "@/actions/books/require-book"
import { generateCover } from "@/modules/books/generate-cover"

export type BookActionResult = { ok: true } | { ok: false; error: string }

/** Gera (ou refaz) a capa do livro. ~100 s em qualidade high. */
export async function generateCoverAction(bookId: string): Promise<BookActionResult> {
  const ctx = await requireBook(bookId)
  if ("ok" in ctx) return ctx
  if (!ctx.replicateToken) return { ok: false, error: "REPLICATE_API_TOKEN não configurado." }
  try {
    await generateCover(ctx.admin, ctx.book, ctx.replicateToken)
    revalidatePath(`/books/${bookId}`)
    return { ok: true }
  } catch (error: unknown) {
    revalidatePath(`/books/${bookId}`)
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao gerar capa." }
  }
}
