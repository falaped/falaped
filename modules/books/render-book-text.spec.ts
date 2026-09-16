import test from "node:test"
import assert from "node:assert/strict"

import { renderBookText } from "@/modules/books/render-book-text"

test("pediatra: padrão Dra. Lia, título normalizado, gênero pelo título", () => {
  const text = "[A|O] {pediatra} sorriu. A dica [da doutora|do doutor] funcionou."
  const alice = { name: "Alice", gender: "menina" as const }
  assert.equal(renderBookText(text, alice), "A Dra. Lia sorriu. A dica da doutora funcionou.")
  assert.equal(renderBookText(text, { ...alice, pediatricianName: "dr marcos silva" }), "O Dr. Marcos Silva sorriu. A dica do doutor funcionou.".replace("Marcos Silva", "marcos silva"))
  assert.equal(renderBookText(text, { ...alice, pediatricianName: "Doutora Ana" }), "A Dra. Ana sorriu. A dica da doutora funcionou.")
  assert.equal(renderBookText(text, { ...alice, pediatricianName: "Marina Duarte" }), "A Marina Duarte sorriu. A dica da doutora funcionou.")
})

test("renderBookText substitui nome e escolhe a forma do gênero", () => {
  const text = "{nome} ficou {animado|animada} e {ele|ela} sorriu."
  assert.equal(
    renderBookText(text, { name: "Samuel", gender: "menino" }),
    "Samuel ficou animado e ele sorriu.",
  )
  assert.equal(
    renderBookText(text, { name: "Alice", gender: "menina" }),
    "Alice ficou animada e ela sorriu.",
  )
})
