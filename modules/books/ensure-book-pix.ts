import type { SupabaseClient } from "@supabase/supabase-js"

import { bookPriceCents, PIX_EXPIRES_IN_SECONDS } from "@/modules/books/constants"
import { createPixQrCode } from "@/modules/payments/create-pix-qr-code"

export type BookPix = {
  /** Copia e cola do Pix. */
  payload: string
  /** PNG em base64, sem o prefixo data:. */
  encodedImage: string
  expiresAt: string
  amount: string
}

type Row = {
  id: string
  child_name: string
  paid_at: string | null
  pix_payload: string | null
  pix_encoded_image: string | null
  pix_expires_at: string | null
  lead: { coupon: string | null } | null
}

/**
 * QR do Pix do livro: reaproveita o que está válido e só gera outro quando não
 * existe ou expirou. Cada QR é de uso único e valor fixo, então gerar à toa
 * deixaria códigos órfãos pagáveis na conta.
 */
export async function ensureBookPix(supabase: SupabaseClient, bookId: string): Promise<BookPix> {
  const { data, error } = await supabase
    .from("books")
    .select("id, child_name, paid_at, pix_payload, pix_encoded_image, pix_expires_at, lead:book_leads!books_lead_id_fkey(coupon)")
    .eq("id", bookId)
    .maybeSingle()
  if (error) throw new Error(`[BOOKS] Falha ao buscar o livro: ${error.message}`)
  const book = data as Row | null
  if (!book) throw new Error("[BOOKS] Livro não encontrado.")
  if (book.paid_at) throw new Error("[BOOKS] Este livro já foi pago.")

  const cents = bookPriceCents(book.lead?.coupon)
  const valid = book.pix_payload && book.pix_encoded_image && book.pix_expires_at && new Date(book.pix_expires_at) > new Date()
  if (valid) {
    return {
      payload: book.pix_payload!,
      encodedImage: book.pix_encoded_image!,
      expiresAt: book.pix_expires_at!,
      amount: (cents / 100).toFixed(2),
    }
  }

  const qr = await createPixQrCode({
    value: cents / 100,
    description: `Livro do ${book.child_name} - Falaped`,
    externalReference: book.id,
    expiresInSeconds: PIX_EXPIRES_IN_SECONDS,
  })
  const { error: saveError } = await supabase
    .from("books")
    .update({
      pix_qr_code_id: qr.id,
      pix_payload: qr.payload,
      pix_encoded_image: qr.encodedImage,
      pix_expires_at: qr.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookId)
  if (saveError) throw new Error(`[BOOKS] Falha ao guardar a cobrança: ${saveError.message}`)

  return { payload: qr.payload, encodedImage: qr.encodedImage, expiresAt: qr.expiresAt, amount: (cents / 100).toFixed(2) }
}
