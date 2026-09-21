import type { SupabaseClient } from "@supabase/supabase-js"

import { BOOK_ASSETS_BUCKET } from "@/lib/constants"
import { env } from "@/lib/env"
import { BOOKS_EMAIL_REPLY_TO } from "@/modules/books/constants"
import { bookPdfFilename, buildDeliveryEmail } from "@/modules/books/emails/delivery-email"
import { renderBookText, type BookGender } from "@/modules/books/render-book-text"
import { getBookTheme } from "@/modules/books/themes"

const RESEND_ENDPOINT = "https://api.resend.com/emails"
/** O Resend busca o anexo nesta URL; precisa durar só o tempo do envio. */
const ATTACHMENT_URL_SECONDS = 15 * 60

type Row = {
  child_name: string
  child_gender: BookGender
  theme: string
  pdf_path: string | null
  lead: { first_name: string; email: string } | null
}

/**
 * Entrega o livro pronto por e-mail, com o PDF anexado, e marca
 * `books.delivered_at`. O anexo vai por URL assinada em vez de base64: o
 * Resend busca o arquivo e a função não carrega 5 MB na memória.
 */
export async function deliverBookEmail(supabase: SupabaseClient, bookId: string): Promise<{ to: string }> {
  if (!env.RESEND_API_KEY) throw new Error("[BOOKS] RESEND_API_KEY ausente: e-mail não enviado.")

  const { data, error } = await supabase
    .from("books")
    .select("child_name, child_gender, theme, pdf_path, lead:book_leads!books_lead_id_fkey(first_name, email)")
    .eq("id", bookId)
    .maybeSingle()
  if (error) throw new Error(`[BOOKS] Falha ao buscar o pedido: ${error.message}`)
  const row = data as Row | null
  if (!row?.lead) throw new Error("[BOOKS] Pedido sem comprador: nada a enviar.")
  if (!row.pdf_path) throw new Error("[BOOKS] Gere o PDF antes de enviar.")

  const { data: signed, error: signError } = await supabase.storage
    .from(BOOK_ASSETS_BUCKET)
    .createSignedUrl(row.pdf_path, ATTACHMENT_URL_SECONDS)
  if (signError || !signed?.signedUrl) throw new Error(`[BOOKS] Falha ao assinar o PDF: ${signError?.message}`)

  const theme = getBookTheme(row.theme)
  const { subject, html, text } = buildDeliveryEmail({
    firstName: row.lead.first_name,
    childName: row.child_name,
    title: renderBookText(theme.title, { name: row.child_name, gender: row.child_gender }),
  })

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.BOOKS_EMAIL_FROM,
      to: [row.lead.email],
      reply_to: BOOKS_EMAIL_REPLY_TO,
      subject,
      html,
      text,
      attachments: [{ filename: bookPdfFilename(row.child_name), path: signed.signedUrl }],
    }),
  })
  if (!res.ok) throw new Error(`[BOOKS] Resend recusou o e-mail (${res.status}): ${(await res.text()).slice(0, 200)}`)

  const { error: updateError } = await supabase
    .from("books")
    .update({ delivered_at: new Date().toISOString() })
    .eq("id", bookId)
  if (updateError) throw new Error(`[BOOKS] E-mail enviado, mas falhou ao marcar a entrega: ${updateError.message}`)
  return { to: row.lead.email }
}
