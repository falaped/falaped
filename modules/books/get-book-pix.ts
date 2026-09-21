import type { SupabaseClient } from "@supabase/supabase-js"

import { env } from "@/lib/env"
import { bookPriceCents } from "@/modules/books/constants"
import { buildPixPayload } from "@/modules/payments/build-pix-payload"
import { renderQrSvg } from "@/modules/payments/render-qr-svg"

export type BookPix = {
  /** Copia e cola do Pix. */
  payload: string
  /** QR pronto para embutir na página. */
  svg: string
  amount: string
  /** Identificador que o comprador vê no comprovante e você vê no extrato. */
  reference: string
}

type Row = {
  id: string
  paid_at: string | null
  lead: { coupon: string | null } | null
}

/**
 * Pix do livro, montado na hora a partir da chave do recebedor. Nada é
 * guardado: o código é função do livro e do preço, então recalcular é mais
 * barato que persistir e invalidar.
 */
export async function getBookPix(supabase: SupabaseClient, bookId: string): Promise<BookPix> {
  if (!env.PIX_KEY) throw new Error("[BOOKS] PIX_KEY ausente: cobrança não gerada.")

  const { data, error } = await supabase
    .from("books")
    .select("id, paid_at, lead:book_leads!books_lead_id_fkey(coupon)")
    .eq("id", bookId)
    .maybeSingle()
  if (error) throw new Error(`[BOOKS] Falha ao buscar o livro: ${error.message}`)
  const book = data as Row | null
  if (!book) throw new Error("[BOOKS] Livro não encontrado.")
  if (book.paid_at) throw new Error("[BOOKS] Este livro já foi pago.")

  const cents = bookPriceCents(book.lead?.coupon)
  // Curto o bastante para o limite de 25 caracteres do txid e longo o bastante
  // para casar comprovante com pedido sem ambiguidade.
  const reference = `FALAPED${book.id.replace(/-/g, "").slice(0, 12).toUpperCase()}`
  const payload = buildPixPayload({
    key: env.PIX_KEY,
    amount: cents / 100,
    merchantName: env.PIX_MERCHANT_NAME,
    merchantCity: env.PIX_MERCHANT_CITY,
    txid: reference,
  })
  return { payload, svg: renderQrSvg(payload), amount: (cents / 100).toFixed(2), reference }
}
