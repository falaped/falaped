import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * `ensureBookPix` alcança `lib/env`, que valida as vars no import. Os specs
 * rodam sem .env, então preenchemos o mínimo e carregamos sob demanda.
 */
async function load() {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co"
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "test"
  delete process.env.ASAAS_API_KEY
  const [pix, paid] = await Promise.all([
    import("@/modules/books/ensure-book-pix"),
    import("@/modules/books/mark-book-paid"),
  ])
  return { ensureBookPix: pix.ensureBookPix, markBookPaid: paid.markBookPaid }
}

type BookRow = Record<string, unknown>

/** Fake com books.maybeSingle e books.update, guardando o que foi gravado. */
function fakeSupabase(book: BookRow | null, updates: BookRow[] = []) {
  const query = (rows: BookRow | null) => {
    const q = {
      select: () => q,
      eq: () => q,
      maybeSingle: async () => ({ data: rows, error: null }),
      update: (values: BookRow) => {
        updates.push(values)
        return { eq: async () => ({ error: null }) }
      },
    }
    return q
  }
  return { from: () => query(book) } as unknown as SupabaseClient
}

const future = new Date(Date.now() + 3600_000).toISOString()
const past = new Date(Date.now() - 1000).toISOString()

test("reaproveita o QR ainda válido em vez de gerar outro na Asaas", async () => {
  const { ensureBookPix } = await load()
  // Sem ASAAS_API_KEY no ambiente de teste: se tentasse gerar, lançaria erro.
  const pix = await ensureBookPix(
    fakeSupabase({
      id: "b1",
      child_name: "Samuel",
      paid_at: null,
      pix_payload: "00020126-copia-e-cola",
      pix_encoded_image: "base64",
      pix_expires_at: future,
      lead: { coupon: null },
    }),
    "b1",
  )
  assert.equal(pix.payload, "00020126-copia-e-cola")
  assert.equal(pix.amount, "29.99")
})

test("aplica o desconto do cupom no valor cobrado", async () => {
  const { ensureBookPix } = await load()
  const pix = await ensureBookPix(
    fakeSupabase({
      id: "b1",
      child_name: "Samuel",
      paid_at: null,
      pix_payload: "x",
      pix_encoded_image: "y",
      pix_expires_at: future,
      lead: { coupon: "GABIMARINHO10" },
    }),
    "b1",
  )
  assert.equal(pix.amount, "26.99")
})

test("QR expirado não é reaproveitado (tenta gerar e falha sem chave)", async () => {
  const { ensureBookPix } = await load()
  await assert.rejects(
    ensureBookPix(
      fakeSupabase({
        id: "b1",
        child_name: "Samuel",
        paid_at: null,
        pix_payload: "velho",
        pix_encoded_image: "y",
        pix_expires_at: past,
        lead: { coupon: null },
      }),
      "b1",
    ),
    /\[PAYMENTS\] ASAAS_API_KEY/,
  )
})

test("livro já pago não gera cobrança nova", async () => {
  const { ensureBookPix } = await load()
  await assert.rejects(
    ensureBookPix(
      fakeSupabase({ id: "b1", child_name: "Samuel", paid_at: past, pix_payload: null, pix_encoded_image: null, pix_expires_at: null, lead: null }),
      "b1",
    ),
    /já foi pago/,
  )
})

test("markBookPaid é idempotente: o segundo webhook não regrava", async () => {
  const { markBookPaid } = await load()
  const updates: BookRow[] = []
  const first = await markBookPaid(fakeSupabase({ id: "b1", lead_id: "lead1", paid_at: null }, updates), "b1")
  assert.equal(first.alreadyPaid, false)
  assert.equal(updates.length, 2) // books.paid_at + book_leads.status

  const again: BookRow[] = []
  const second = await markBookPaid(fakeSupabase({ id: "b1", lead_id: "lead1", paid_at: past }, again), "b1")
  assert.equal(second.alreadyPaid, true)
  assert.equal(again.length, 0)
})
