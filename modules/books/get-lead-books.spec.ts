import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getLeadBooks } from "@/modules/books/get-lead-books"

const lead = { id: "lead1", email: "marina@email.com", status: "cover_ready" }
const books = [
  { id: "b1", lead_id: "lead1", theme: "o-dia-da-vacina", child_name: "Lucas" },
  { id: "b2", lead_id: "lead1", theme: "adeus-chupeta", child_name: "Lucas" },
]
// b1 tem capa pronta; b2 ainda está desenhando.
const pages = [
  { book_id: "b1", index: 0, status: "ready" },
  { book_id: "b2", index: 0, status: "pending" },
]

/** Fake mínimo: book_leads.maybeSingle, books.order, book_pages.order e storage. */
function fakeSupabase(signed: { path: string; signedUrl: string }[]) {
  const asThenable = <T>(rows: T) => {
    const q = {
      select: () => q,
      eq: () => q,
      in: () => q,
      order: () => q,
      maybeSingle: async () => ({ data: rows, error: null }),
      then: (resolve: (v: { data: T; error: null }) => unknown) => resolve({ data: rows, error: null }),
    }
    return q
  }
  return {
    from: (table: string) =>
      table === "book_leads" ? asThenable(lead) : table === "books" ? asThenable(books) : asThenable(pages),
    storage: { from: () => ({ createSignedUrls: async () => ({ data: signed, error: null }) }) },
  } as unknown as SupabaseClient
}

test("devolve os livros do lead com a capa assinada só de quem tem capa pronta", async () => {
  const supabase = fakeSupabase([{ path: "b1/pages/0.jpg", signedUrl: "https://signed/b1" }])
  const ctx = await getLeadBooks(supabase, "lead1")

  assert.equal(ctx?.books.length, 2)
  assert.deepEqual(
    ctx?.books.map((b) => b.book.id),
    ["b1", "b2"],
  )
  assert.equal(ctx?.books[0].coverUrl, "https://signed/b1")
  assert.equal(ctx?.books[1].coverUrl, null, "capa pendente não vira URL")
  // cada livro fica só com as próprias páginas
  assert.deepEqual(ctx?.books[0].book.pages.map((p) => p.book_id), ["b1"])
  assert.deepEqual(ctx?.books[1].book.pages.map((p) => p.book_id), ["b2"])
})
