"use server"

import { revalidatePath } from "next/cache"

import { requireBook } from "@/actions/books/require-book"
import type { BookActionResult } from "@/actions/books/generate-cover"
import { generatePages } from "@/modules/books/generate-pages"

export type GeneratePagesActionResult = (BookActionResult & { ready?: number[]; failed?: number[] })

/**
 * Aprova a capa e gera as outras 19 páginas em ondas. Chamar de novo após
 * falha retoma só as pendentes. Pode levar vários minutos: a página do livro
 * define maxDuration para cobrir.
 */
export async function generatePagesAction(bookId: string): Promise<GeneratePagesActionResult> {
  const ctx = await requireBook(bookId)
  if ("ok" in ctx) return ctx
  if (!ctx.replicateToken) return { ok: false, error: "REPLICATE_API_TOKEN não configurado." }
  try {
    const result = await generatePages(ctx.admin, ctx.book, ctx.book.pages, ctx.replicateToken)
    revalidatePath(`/books/${bookId}`)
    if (result.failed.length)
      return { ok: false, error: `Falharam as páginas ${result.failed.join(", ")}. Clique de novo para retomar.`, ...result }
    return { ok: true, ...result }
  } catch (error: unknown) {
    revalidatePath(`/books/${bookId}`)
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao gerar páginas." }
  }
}
