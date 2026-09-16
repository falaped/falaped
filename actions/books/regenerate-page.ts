"use server"

import { revalidatePath } from "next/cache"

import { requireBook } from "@/actions/books/require-book"
import type { BookActionResult } from "@/actions/books/generate-cover"
import { regeneratePage } from "@/modules/books/regenerate-page"

/** Refaz uma página (0..19). Invalida o PDF. */
export async function regeneratePageAction(bookId: string, index: number): Promise<BookActionResult> {
  const ctx = await requireBook(bookId)
  if ("ok" in ctx) return ctx
  if (!ctx.replicateToken) return { ok: false, error: "REPLICATE_API_TOKEN não configurado." }
  try {
    await regeneratePage(ctx.admin, ctx.book, index, ctx.replicateToken)
    revalidatePath(`/books/${bookId}`)
    return { ok: true }
  } catch (error: unknown) {
    revalidatePath(`/books/${bookId}`)
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao refazer página." }
  }
}
