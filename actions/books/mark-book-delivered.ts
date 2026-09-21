"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { BookActionResult } from "@/actions/books/require-book"
import { requireBooksAdmin } from "@/actions/books/require-books-admin"
import { createAdminClient } from "@/lib/supabase/server-admin"

/** Registra que o PDF foi enviado ao comprador pelo WhatsApp (envio é manual, pelo wa.me). */
export async function markBookDeliveredAction(bookId: string): Promise<BookActionResult> {
  const admin = await requireBooksAdmin()
  if (!admin.ok) return admin
  const parsed = z.uuid().safeParse(bookId)
  if (!parsed.success) return { ok: false, error: "Pedido inválido." }
  const { error } = await createAdminClient()
    .from("books")
    .update({ delivered_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .not("lead_id", "is", null)
  if (error) return { ok: false, error: `Falha ao marcar a entrega: ${error.message}` }
  revalidatePath("/books/leads")
  return { ok: true }
}
