import assert from "node:assert/strict"
import { test } from "node:test"

import { bookLeadSchema } from "@/lib/schemas/book"
import { BOOK_COUPONS, BOOK_PRICE_CENTS, bookPriceWithCoupon } from "@/modules/books/constants"

/** Preço esperado para um cupom, escrito como a landing mostra. */
const brl = (pct: number) => (Math.max(1, Math.round(BOOK_PRICE_CENTS * (1 - pct / 100))) / 100).toFixed(2).replace(".", ",")

const base = { firstName: "Marina", lastName: "Duarte", email: "Marina@Email.com ", consent: true as const }

test("cupom válido dá 10% e inválido é recusado", () => {
  assert.equal(bookPriceWithCoupon(null), brl(0))
  assert.equal(bookPriceWithCoupon("GABIMARINHO10"), brl(BOOK_COUPONS.GABIMARINHO10))
  assert.equal(bookPriceWithCoupon("MARIZINATO10"), brl(BOOK_COUPONS.MARIZINATO10))
  assert.equal(bookPriceWithCoupon("NADA"), brl(0), "cupom inexistente não desconta")
  assert.equal(bookLeadSchema.safeParse({ ...base, whatsapp: "31997815503", coupon: "gabimarinho10" }).data?.coupon, "GABIMARINHO10")
  assert.equal(bookLeadSchema.safeParse({ ...base, whatsapp: "31997815503", coupon: "" }).data?.coupon, null)
  assert.equal(bookLeadSchema.safeParse({ ...base, whatsapp: "31997815503", coupon: "XPTO" }).success, false)
})

test("whatsapp normaliza máscara e DDI; e-mail vira minúsculo", () => {
  const ok = bookLeadSchema.safeParse({ ...base, whatsapp: "+55 (31) 99781-5503" })
  assert.equal(ok.data?.whatsapp, "31997815503")
  assert.equal(ok.data?.email, "marina@email.com")
  assert.equal(bookLeadSchema.safeParse({ ...base, whatsapp: "3132345678" }).data?.whatsapp, "3132345678")
  assert.equal(bookLeadSchema.safeParse({ ...base, whatsapp: "997815503" }).success, false)
  assert.equal(bookLeadSchema.safeParse({ ...base, whatsapp: "31997815503", consent: false }).success, false)
})
