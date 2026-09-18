"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { requireBooksAdmin } from "@/actions/books/require-books-admin"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { claimLeadBook } from "@/modules/books/claim-lead-book"

/** Form action da tela de pedidos: assume o livro do lead e abre a página dele para gerar as páginas. */
export async function claimLeadBookAction(formData: FormData): Promise<void> {
  const admin = await requireBooksAdmin()
  if (!admin.ok) throw new Error(admin.error)
  const bookId = z.uuid().parse(formData.get("bookId"))
  await claimLeadBook(createAdminClient(), bookId, admin.profileId)
  redirect(`/books/${bookId}`)
}
