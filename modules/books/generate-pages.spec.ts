import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { generatePages, type GeneratePagesOptions } from "@/modules/books/generate-pages"
import type { Book, BookPage } from "@/modules/books/types"

// Supabase fake: só precisa aceitar .from().update().eq()
const updates: unknown[] = []
const supabase = {
  from: () => ({ update: (row: unknown) => ({ eq: async () => { updates.push(row) } }) }),
} as unknown as SupabaseClient

const book = { id: "b1", theme: "o-dia-da-vacina", child_name: "Ana", child_gender: "female", quality: "medium" } as unknown as Book
const cover = { index: 0, status: "ready" } as BookPage

function fakeGenerate(failAt: number[] = []) {
  let inFlight = 0
  let peak = 0
  const started: number[] = []
  const generatePage: GeneratePagesOptions["generatePage"] = async (_s, _b, index) => {
    started.push(index)
    inFlight++
    peak = Math.max(peak, inFlight)
    await new Promise((r) => setTimeout(r, 2))
    inFlight--
    if (failAt.includes(index)) throw new Error("boom")
    return { index, status: "ready" } as BookPage
  }
  return { generatePage, started, peak: () => peak }
}

test("nunca passa de 2 em paralelo e gera as 19 páginas", async () => {
  const f = fakeGenerate()
  const r = await generatePages(supabase, book, [cover], "t", { generatePage: f.generatePage })
  assert.equal(f.peak(), 2)
  assert.equal(r.ready.length, 19)
  assert.deepEqual(r.failed, [])
  assert.deepEqual(r.pending, [])
  assert.equal((updates.at(-1) as { status: string }).status, "ready")
})

test("página só começa depois das referências dela ficarem prontas", async () => {
  const f = fakeGenerate()
  await generatePages(supabase, book, [cover], "t", { generatePage: f.generatePage })
  // no tema, as páginas 3..7 referenciam a 2 e a 8 referencia 7 e 5: nenhuma começa antes da referência
  const pos = (i: number) => f.started.indexOf(i)
  for (const i of [3, 4, 5, 6, 7]) assert.ok(pos(i) > pos(2), `página ${i} começou antes da 2`)
  assert.ok(pos(8) > pos(7) && pos(8) > pos(5), "página 8 começou antes das âncoras 7 e 5")
})

test("com orçamento estourado devolve o resto em pending e livro segue generating", async () => {
  const f = fakeGenerate()
  const r = await generatePages(supabase, book, [cover], "t", { generatePage: f.generatePage, budgetMs: -1 })
  assert.equal(r.ready.length, 0)
  assert.equal(r.pending.length, 19)
  assert.equal((updates.at(-1) as { status: string }).status, "generating")
})

test("falha marca a página e o livro como failed, sem travar", async () => {
  const f = fakeGenerate([5])
  const r = await generatePages(supabase, book, [cover], "t", { generatePage: f.generatePage })
  assert.ok(r.failed.includes(5))
  assert.deepEqual(r.pending, [])
  assert.equal((updates.at(-1) as { status: string }).status, "failed")
})
