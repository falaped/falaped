import { z } from "zod"

import { getBookLeadId } from "@/lib/book-lead-cookie"
import { env } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { COVER_INDEX } from "@/modules/books/constants"
import { generateCover } from "@/modules/books/generate-cover"
import { getLeadBook } from "@/modules/books/get-lead-book"

// Capa em quality medium leva ≈ 45–100 s; teto do Hobby é 300 s.
export const maxDuration = 300
/** Uma capa presa em `pending` além disto é considerada morta e pode ser refeita. */
const STALE_MS = 5 * 60 * 1000

const bodySchema = z.object({ bookId: z.uuid() })

export type LeadCoverResult = { ok: true; coverUrl: string } | { ok: false; error: string }

/**
 * POST /api/books/lead/cover — gera a capa grátis do livro do lead (cookie).
 * Uma só por lead: se já está pronta, devolve a mesma; se está em andamento,
 * recusa; se falhou ou ficou presa, refaz. Route handler (e não action) para o
 * cliente poder esperar a geração sem bloquear a navegação.
 */
export async function POST(request: Request) {
  const leadId = await getBookLeadId()
  if (!leadId) return Response.json({ ok: false, error: "Cadastro não encontrado." } satisfies LeadCoverResult, { status: 401 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ ok: false, error: "Pedido inválido." } satisfies LeadCoverResult, { status: 400 })
  if (!env.REPLICATE_API_TOKEN) return Response.json({ ok: false, error: "Geração de imagens não configurada." } satisfies LeadCoverResult, { status: 500 })

  const admin = createAdminClient()
  const ctx = await getLeadBook(admin, leadId)
  if (!ctx?.book || ctx.book.id !== parsed.data.bookId)
    return Response.json({ ok: false, error: "Livro não encontrado." } satisfies LeadCoverResult, { status: 404 })
  if (ctx.coverUrl) return Response.json({ ok: true, coverUrl: ctx.coverUrl } satisfies LeadCoverResult)

  const cover = ctx.book.pages.find((p) => p.index === COVER_INDEX)
  if (cover?.status === "pending" && Date.now() - new Date(cover.updated_at).getTime() < STALE_MS)
    return Response.json({ ok: false, error: "A capa ainda está sendo desenhada. Aguarde um instante." } satisfies LeadCoverResult, { status: 409 })

  try {
    await generateCover(admin, ctx.book, env.REPLICATE_API_TOKEN)
    await admin.from("book_leads").update({ status: "cover_ready", updated_at: new Date().toISOString() }).eq("id", leadId)
    const after = await getLeadBook(admin, leadId)
    if (!after?.coverUrl) throw new Error("Capa gerada, mas não foi possível carregá-la.")
    return Response.json({ ok: true, coverUrl: after.coverUrl } satisfies LeadCoverResult)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message.replace(/^\[BOOKS\] /, "") : "Erro ao gerar a capa."
    return Response.json({ ok: false, error: message } satisfies LeadCoverResult, { status: 500 })
  }
}
