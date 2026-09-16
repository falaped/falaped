import test from "node:test"
import assert from "node:assert/strict"

import { renderBookText } from "@/modules/books/render-book-text"

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
