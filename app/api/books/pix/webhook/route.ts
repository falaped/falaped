import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import { env } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { markBookPaid } from "@/modules/books/mark-book-paid"
import { getPayment } from "@/modules/payments/get-payment"

/** Status em que o dinheiro já é do vendedor. Pix vai direto para RECEIVED;
 *  CONFIRMED aparece em conta pessoa física durante o bloqueio cautelar. */
const PAID_STATUSES = ["RECEIVED", "CONFIRMED"]

/**
 * POST /api/books/pix/webhook — a Asaas avisa que uma cobrança mudou.
 *
 * O corpo do webhook nunca decide nada: ele só diz qual pagamento olhar. Quem
 * decide se está pago é a consulta na API, porque a entrega é "pelo menos uma
 * vez" e fora de ordem (um PAYMENT_OVERDUE atrasado não pode desfazer um
 * pagamento). Responder 2xx é obrigatório mesmo no que ignoramos: 15 falhas
 * seguidas e a Asaas interrompe a fila.
 */
export async function POST(request: Request) {
  if (!env.ASAAS_WEBHOOK_TOKEN) return Response.json({ ok: false }, { status: 503 })
  if (request.headers.get("asaas-access-token") !== env.ASAAS_WEBHOOK_TOKEN)
    return Response.json({ ok: false }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { event?: string; payment?: { id?: string } } | null
  const paymentId = body?.payment?.id
  if (!paymentId) return Response.json({ ok: true, ignored: "sem pagamento" })

  try {
    const payment = await getPayment(paymentId)
    if (!PAID_STATUSES.includes(payment.status)) return Response.json({ ok: true, ignored: payment.status })

    // O QR estático tem valor fixo e uso único, então quem pagou pagou o preço
    // certo: basta achar o livro dele.
    const admin = createAdminClient()
    const bookId = await findBookId(admin, payment.pixQrCodeId, payment.externalReference)
    if (!bookId) {
      console.error(`[PAYMENTS] Pagamento ${payment.id} sem livro correspondente.`)
      return Response.json({ ok: true, ignored: "livro não encontrado" })
    }

    const { alreadyPaid } = await markBookPaid(admin, bookId)
    return Response.json({ ok: true, bookId, alreadyPaid })
  } catch (error: unknown) {
    // 500 faz a Asaas reenviar: falha nossa (rede, banco) não pode perder venda.
    console.error("[PAYMENTS] Webhook falhou:", error)
    return Response.json({ ok: false }, { status: 500 })
  }
}

/**
 * Livro da cobrança: pelo QR que a originou e, se faltar, pelo externalReference
 * que gravamos no QR. Dois `eq` em vez de um `or` montado com string — os dois
 * valores vêm de fora e vazariam para o filtro do PostgREST.
 */
async function findBookId(
  supabase: SupabaseClient,
  pixQrCodeId: string | null,
  externalReference: string | null,
): Promise<string | null> {
  if (pixQrCodeId) {
    const { data, error } = await supabase.from("books").select("id").eq("pix_qr_code_id", pixQrCodeId).maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return data.id as string
  }
  if (externalReference && z.uuid().safeParse(externalReference).success) {
    const { data, error } = await supabase.from("books").select("id").eq("id", externalReference).maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return data.id as string
  }
  return null
}
