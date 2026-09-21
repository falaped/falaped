"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { BookActionResult } from "@/actions/books/require-book"
import { requireBooksAdmin } from "@/actions/books/require-books-admin"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { notifyBookProduction } from "@/modules/books/notify-book-production"

/** Reenvio manual do aviso "seu livro está sendo produzido" na tela de pedidos. */
export async function notifyBookProductionAction(bookId: string): Promise<BookActionResult> {
  const admin = await requireBooksAdmin()
  if (!admin.ok) return admin
  const parsed = z.uuid().safeParse(bookId)
  if (!parsed.success) return { ok: false, error: "Pedido inválido." }
  try {
    await notifyBookProduction(createAdminClient(), parsed.data)
    revalidatePath("/books/leads")
    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message.replace(/^\[BOOKS\] /, "") : "Erro ao enviar o e-mail." }
  }
}
