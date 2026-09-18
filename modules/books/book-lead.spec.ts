import assert from "node:assert/strict"
import { test } from "node:test"

import { bookLeadSchema } from "@/lib/schemas/book"
import { bookPriceWithCoupon } from "@/modules/books/constants"

const base = { firstName: "Marina", lastName: "Duarte", email: "Marina@Email.com ", consent: true as const }

test("cupom válido dá 10% e inválido é recusado", () => {
  assert.equal(bookPriceWithCoupon(null), "29,99")
  assert.equal(bookPriceWithCoupon("GABIMARINHO10"), "26,99")
  assert.equal(bookPriceWithCoupon("MARIZINATO10"), "26,99")
  assert.equal(bookPriceWithCoupon("NADA"), "29,99")
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
