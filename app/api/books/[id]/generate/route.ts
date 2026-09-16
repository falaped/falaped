import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireBook } from "@/actions/books/require-book"
import { BOOK_PAGE_COUNT } from "@/modules/books/constants"
import { generateCover } from "@/modules/books/generate-cover"
import { generatePages } from "@/modules/books/generate-pages"
import { regeneratePage } from "@/modules/books/regenerate-page"

// Vercel Hobby limita a função a 300 s; uma onda em qualidade high leva ~100–130 s.
export const maxDuration = 300
const BUDGET_MS = 150_000

const bodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("cover") }),
  z.object({ kind: z.literal("pages") }),
  z.object({ kind: z.literal("page"), index: z.number().int().min(0).max(BOOK_PAGE_COUNT - 1) }),
])

export type GenerateResult =
  | { ok: true; ready?: number[]; failed?: number[]; pending?: number[] }
  | { ok: false; error: string; ready?: number[]; failed?: number[]; pending?: number[] }

/**
 * POST /api/books/[id]/generate — gera a capa, as 19 páginas (em ondas dentro
 * do orçamento; enquanto `pending` não estiver vazio o cliente chama de novo)
 * ou refaz uma página. É route handler, e não Server Action, porque uma action
 * em andamento bloqueia o `router.refresh()` do cliente e a grade não atualiza.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ ok: false, error: "Pedido inválido." } satisfies GenerateResult, { status: 400 })

  const ctx = await requireBook(id)
  if ("ok" in ctx) return Response.json(ctx satisfies GenerateResult, { status: ctx.error === "Livro não encontrado." ? 404 : 401 })
  if (!ctx.replicateToken) return Response.json({ ok: false, error: "REPLICATE_API_TOKEN não configurado." } satisfies GenerateResult)

  const body = parsed.data
  let result: GenerateResult
  try {
    if (body.kind === "cover") {
      await generateCover(ctx.admin, ctx.book, ctx.replicateToken)
      result = { ok: true }
    } else if (body.kind === "page") {
      await regeneratePage(ctx.admin, ctx.book, body.index, ctx.replicateToken)
      result = { ok: true }
    } else {
      const waves = await generatePages(ctx.admin, ctx.book, ctx.book.pages, ctx.replicateToken, { budgetMs: BUDGET_MS })
      result = waves.failed.length
        ? { ok: false, error: `Falharam as páginas ${waves.failed.join(", ")}. Clique de novo para retomar.`, ...waves }
        : { ok: true, ...waves }
    }
  } catch (error: unknown) {
    result = { ok: false, error: error instanceof Error ? error.message : "Erro ao gerar." }
  }
  revalidatePath(`/books/${id}`)
  return Response.json(result)
}
