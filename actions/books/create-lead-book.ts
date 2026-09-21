"use server"

import { getBookLeadId } from "@/lib/book-lead-cookie"
import { createLeadBookSchema } from "@/lib/schemas/book"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { MAX_LEAD_COVERS } from "@/modules/books/constants"
import { createBook } from "@/modules/books/create-book"
import { getLeadBooks } from "@/modules/books/get-lead-books"

export type CreateLeadBookResult = { ok: true; bookId: string } | { ok: false; error: string }

/**
 * Passo 3 da landing pública: cria mais um livro do lead (quality medium, sem
 * história personalizada). A capa vem em seguida pela rota
 * /api/books/lead/cover. São até MAX_LEAD_COVERS livros, um por tema: repetir
 * um tema devolve o livro que já existe, em vez de desenhar a mesma capa de
 * novo. Sem fotos novas, reaproveita as do livro anterior.
 */
export async function createLeadBookAction(formData: FormData): Promise<CreateLeadBookResult> {
  const leadId = await getBookLeadId()
  if (!leadId) return { ok: false, error: "Preencha seus dados de contato primeiro." }

  const parsed = createLeadBookSchema.safeParse({
    childName: formData.get("childName"),
    childGender: formData.get("childGender"),
    theme: formData.get("theme"),
    dedication: formData.get("dedication"),
  })
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0)

  const admin = createAdminClient()
  try {
    const ctx = await getLeadBooks(admin, leadId)
    if (!ctx) return { ok: false, error: "Cadastro não encontrado. Preencha seus dados de novo." }

    const sameTheme = ctx.books.find((b) => b.book.theme === parsed.data.theme)
    if (sameTheme) return { ok: true, bookId: sameTheme.book.id }
    if (ctx.books.length >= MAX_LEAD_COVERS)
      return { ok: false, error: `Você já criou as ${MAX_LEAD_COVERS} capas deste cadastro.` }

    const previous = ctx.books.at(-1)?.book
    const book = await createBook(
      admin,
      { leadId },
      { ...parsed.data, quality: "medium", photos, copyPhotosFrom: photos.length ? undefined : previous?.photo_paths ?? [] },
    )
    return { ok: true, bookId: book.id }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message.replace(/^\[BOOKS\] /, "") : "Erro ao criar o livro." }
  }
}
