"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireBooksAdmin } from "@/actions/books/require-books-admin"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { deliverBookEmail } from "@/modules/books/deliver-book-email"

export type DeliverBookEmailResult = { ok: true; to: string } | { ok: false; error: string }

/** Envia o livro pronto ao comprador por e-mail, com o PDF anexado. */
export async function deliverBookEmailAction(bookId: string): Promise<DeliverBookEmailResult> {
  const admin = await requireBooksAdmin()
  if (!admin.ok) return admin
  const parsed = z.uuid().safeParse(bookId)
  if (!parsed.success) return { ok: false, error: "Pedido inválido." }
  try {
    const { to } = await deliverBookEmail(createAdminClient(), parsed.data)
    revalidatePath("/books/leads")
    return { ok: true, to }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message.replace(/^\[BOOKS\] /, "") : "Erro ao enviar o e-mail." }
  }
}
