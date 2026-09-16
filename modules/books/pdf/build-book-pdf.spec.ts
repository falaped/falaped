import test from "node:test"
import assert from "node:assert/strict"

import { buildBookPdf, BOOK_ENDING_CTA } from "@/modules/books/pdf/build-book-pdf"
import { BOOK_PAGE_COUNT } from "@/modules/books/constants"

// PNG 1x1 válido (vermelho), o suficiente para o pdfkit embutir.
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "base64",
)
const pages = Array.from({ length: BOOK_PAGE_COUNT }, () => PNG_1x1)

test("gera um PDF com 20 páginas e as fontes embutidas", async () => {
  const pdf = await buildBookPdf({ pages, childName: "Samuel", dedication: "Para você, com amor." })
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-")
  const text = pdf.toString("latin1")
  assert.equal(text.match(/\/Type \/Page(?!s)/g)?.length, BOOK_PAGE_COUNT)
  assert.match(text, /CormorantGaramond/)
  assert.match(text, /PlayfairDisplay/)
})

test("página final aceita pediatra e logo opcionais", async () => {
  const pdf = await buildBookPdf({
    pages,
    childName: "Alice",
    dedication: "Dedicatória.",
    pediatricianName: "Dra. Lia",
    pediatricianLogo: PNG_1x1,
  })
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-")
  assert.ok(BOOK_ENDING_CTA.includes("falaped.com.br"))
})

test("rejeita número errado de páginas", () => {
  assert.throws(() => buildBookPdf({ pages: pages.slice(1), childName: "X", dedication: "d" }), /\[BOOKS\].*20/)
})
