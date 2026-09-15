import test from "node:test"
import assert from "node:assert/strict"

import { renderBookText } from "@/modules/books/render-book-text"
import { BOOK_THEMES } from "@/modules/books/themes"

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

test("todo tema tem 16 páginas e renderiza sem placeholders sobrando", () => {
  for (const theme of Object.values(BOOK_THEMES)) {
    assert.equal(theme.pages.length, 16, theme.slug)
    const texts = [
      theme.title,
      theme.subtitle,
      theme.dedication,
      theme.coverScene,
      theme.dedicationScene,
      theme.endingScene,
      ...theme.pages.flatMap((p) => [p.text, p.scene]),
    ]
    for (const gender of ["menino", "menina"] as const) {
      for (const t of texts) {
        const out = renderBookText(t, { name: "Nome", gender })
        assert.doesNotMatch(out, /[{}]/, `${theme.slug}: ${out}`)
      }
    }
  }
})
