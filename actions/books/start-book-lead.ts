"use server"

import { headers } from "next/headers"

import { setBookLeadId } from "@/lib/book-lead-cookie"
import { bookLeadSchema } from "@/lib/schemas/book"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { upsertBookLead } from "@/modules/books/upsert-book-lead"

export type StartBookLeadResult = { ok: true; hasBook: boolean } | { ok: false; error: string }

/**
 * Passo 1 da landing pública (sem sessão): grava o lead antes da capa, para
 * follow-up mesmo que abandone, e deixa o id no cookie. Se o e-mail já tem
 * livro, o wizard pula para a capa (uma capa por pessoa).
 */
export async function startBookLeadAction(input: unknown): Promise<StartBookLeadResult> {
  const parsed = bookLeadSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || null
  try {
    const { lead, bookId } = await upsertBookLead(createAdminClient(), parsed.data, ip)
    await setBookLeadId(lead.id)
    return { ok: true, hasBook: !!bookId }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message.replace(/^\[BOOKS\] /, "") : "Erro ao salvar seus dados." }
  }
}
