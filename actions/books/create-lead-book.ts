"use server"

import { getBookLeadId } from "@/lib/book-lead-cookie"
import { createLeadBookSchema } from "@/lib/schemas/book"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { createBook } from "@/modules/books/create-book"
import { getLeadBook } from "@/modules/books/get-lead-book"

export type CreateLeadBookResult = { ok: true; bookId: string } | { ok: false; error: string }

/**
 * Passo 2 da landing pública: cria o único livro do lead (quality medium, sem
 * história personalizada) com as fotos. A capa é gerada em seguida pela rota
 * /api/books/lead/cover. Se o lead já tem livro, devolve o existente.
 */
export async function createLeadBookAction(formData: FormData): Promise<CreateLeadBookResult> {
  const leadId = await getBookLeadId()
  if (!leadId) return { ok: false, error: "Preencha seus dados de contato primeiro." }

  const parsed = createLeadBookSchema.safeParse({
    childName: formData.get("childName"),
    childGender: formData.get("childGender"),
    theme: formData.get("theme"),
  })
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0)

  const admin = createAdminClient()
  try {
    const ctx = await getLeadBook(admin, leadId)
    if (!ctx) return { ok: false, error: "Cadastro não encontrado. Preencha seus dados de novo." }
    if (ctx.book) return { ok: true, bookId: ctx.book.id }
    const book = await createBook(admin, { leadId }, { ...parsed.data, quality: "medium", photos })
    return { ok: true, bookId: book.id }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message.replace(/^\[BOOKS\] /, "") : "Erro ao criar o livro." }
  }
}
