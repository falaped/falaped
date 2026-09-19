"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { requireBooksAdmin } from "@/actions/books/require-books-admin"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { claimLeadBook } from "@/modules/books/claim-lead-book"
import { notifyBookProduction } from "@/modules/books/notify-book-production"

/**
 * Form action da tela de pedidos: confirma o Pix, assume o livro do lead, avisa
 * o comprador por e-mail que entrou em produção e abre a página para gerar as
 * páginas. Se o e-mail falhar, o livro segue assumido e a tela de pedidos
 * mostra o botão de reenvio.
 */
export async function claimLeadBookAction(formData: FormData): Promise<void> {
  const admin = await requireBooksAdmin()
  if (!admin.ok) throw new Error(admin.error)
  const bookId = z.uuid().parse(formData.get("bookId"))
  const supabase = createAdminClient()
  await claimLeadBook(supabase, bookId, admin.profileId)
  await notifyBookProduction(supabase, bookId).catch((error: unknown) => {
    console.error("[BOOKS] Aviso de produção não enviado:", error)
  })
  redirect(`/books/${bookId}`)
}
