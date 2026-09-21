import type { SupabaseClient } from "@supabase/supabase-js"

import { env } from "@/lib/env"
import { BOOKS_EMAIL_REPLY_TO } from "@/modules/books/constants"
import { buildProductionEmail } from "@/modules/books/emails/production-email"
import { renderBookText } from "@/modules/books/render-book-text"
import { getBookTheme } from "@/modules/books/themes"
import type { BookGender } from "@/modules/books/render-book-text"

const RESEND_ENDPOINT = "https://api.resend.com/emails"

type Row = {
  child_name: string
  child_gender: BookGender
  theme: string
  lead: { first_name: string; email: string } | null
}

/**
 * Avisa por e-mail o comprador da landing que o livro entrou em produção e
 * marca `books.notified_at`. Chamado quando o gestor confirma o Pix (e no
 * botão de reenvio, se o envio falhar).
 */
export async function notifyBookProduction(supabase: SupabaseClient, bookId: string): Promise<void> {
  if (!env.RESEND_API_KEY) throw new Error("[BOOKS] RESEND_API_KEY ausente: e-mail não enviado.")

  const { data, error } = await supabase
    .from("books")
    .select("child_name, child_gender, theme, lead:book_leads!books_lead_id_fkey(first_name, email)")
    .eq("id", bookId)
    .maybeSingle()
  if (error) throw new Error(`[BOOKS] Falha ao buscar o pedido: ${error.message}`)
  const row = data as Row | null
  if (!row?.lead) throw new Error("[BOOKS] Pedido sem comprador: nada a avisar.")

  const theme = getBookTheme(row.theme)
  const { subject, html, text } = buildProductionEmail({
    firstName: row.lead.first_name,
    childName: row.child_name,
    title: renderBookText(theme.title, { name: row.child_name, gender: row.child_gender }),
  })

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.BOOKS_EMAIL_FROM, to: [row.lead.email], reply_to: BOOKS_EMAIL_REPLY_TO, subject, html, text }),
  })
  if (!res.ok) throw new Error(`[BOOKS] Resend recusou o e-mail (${res.status}): ${(await res.text()).slice(0, 200)}`)

  const { error: updateError } = await supabase
    .from("books")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", bookId)
  if (updateError) throw new Error(`[BOOKS] E-mail enviado, mas falhou ao marcar o aviso: ${updateError.message}`)
}
