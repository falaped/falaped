"use server"

import { revalidatePath } from "next/cache"

import { requireBook } from "@/actions/books/require-book"
import type { BookActionResult } from "@/actions/books/generate-cover"
import { generatePages } from "@/modules/books/generate-pages"

export type GeneratePagesActionResult = BookActionResult & { ready?: number[]; failed?: number[]; pending?: number[] }

// Vercel Hobby limita a função a 300 s; uma onda em qualidade high leva ~100–130 s.
// Não abrimos onda nova depois deste tempo e devolvemos `pending` para o cliente chamar de novo.
const BUDGET_MS = 150_000

/**
 * Aprova a capa e gera as outras 19 páginas em ondas dentro do orçamento de
 * tempo. Enquanto `pending` não estiver vazio, o cliente chama de novo; após
 * falha, a chamada seguinte retoma só as pendentes.
 */
export async function generatePagesAction(bookId: string): Promise<GeneratePagesActionResult> {
  const ctx = await requireBook(bookId)
  if ("ok" in ctx) return ctx
  if (!ctx.replicateToken) return { ok: false, error: "REPLICATE_API_TOKEN não configurado." }
  try {
    const result = await generatePages(ctx.admin, ctx.book, ctx.book.pages, ctx.replicateToken, { budgetMs: BUDGET_MS })
    revalidatePath(`/books/${bookId}`)
    if (result.failed.length)
      return { ok: false, error: `Falharam as páginas ${result.failed.join(", ")}. Clique de novo para retomar.`, ...result }
    return { ok: true, ...result }
  } catch (error: unknown) {
    revalidatePath(`/books/${bookId}`)
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao gerar páginas." }
  }
}
