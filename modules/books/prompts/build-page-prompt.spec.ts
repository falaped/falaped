import test from "node:test"
import assert from "node:assert/strict"

import { buildPagePrompt } from "@/modules/books/prompts/build-page-prompt"
import { BOOK_PAGE_COUNT, STORY_PAGE_COUNT } from "@/modules/books/constants"
import { BOOK_THEMES } from "@/modules/books/themes"
import { oDiaDaVacina } from "@/modules/books/themes/o-dia-da-vacina"

const samuel = { name: "Samuel", gender: "menino" as const }
const alice = { name: "Alice", gender: "menina" as const }

test("capa: título e subtítulo renderizados, sem bloco de consistência nem referências", () => {
  const { prompt, refIndexes } = buildPagePrompt({ theme: oDiaDaVacina, child: samuel, index: 0 })
  assert.match(prompt, /"O Escudo do Samuel"/)
  assert.match(prompt, /"Uma história sobre coragem no dia da vacina\."/)
  assert.doesNotMatch(prompt, /book cover already generated/)
  assert.deepEqual(refIndexes, [])
})

test("capa de menina flexiona o título", () => {
  const { prompt } = buildPagePrompt({ theme: oDiaDaVacina, child: alice, index: 0 })
  assert.match(prompt, /"O Escudo da Alice"/)
  assert.match(prompt, /the girl from the reference photos/)
})

test("página de história: texto exato no painel, margem, capa sempre como primeira referência", () => {
  const { prompt, refIndexes } = buildPagePrompt({ theme: oDiaDaVacina, child: samuel, index: 3 })
  assert.match(prompt, /"No café da manhã, Samuel mexeu o cereal sem comer\./)
  assert.match(prompt, /lower third/)
  assert.match(prompt, /margin of at least 8%/)
  assert.match(prompt, /book cover already generated/)
  assert.deepEqual(refIndexes, [0, 2])
})

test("referências nunca apontam para páginas posteriores nem repetem a capa", () => {
  for (let index = 2; index < BOOK_PAGE_COUNT - 1; index++) {
    const { refIndexes } = buildPagePrompt({ theme: oDiaDaVacina, child: samuel, index })
    assert.equal(refIndexes[0], 0, `página ${index}`)
    assert.equal(new Set(refIndexes).size, refIndexes.length, `página ${index}`)
    for (const r of refIndexes) assert.ok(r < index, `página ${index} referencia ${r}`)
  }
})

test("dedicatória e final não pedem texto na imagem", () => {
  for (const index of [1, 19]) {
    const { prompt, refIndexes } = buildPagePrompt({ theme: oDiaDaVacina, child: samuel, index })
    assert.match(prompt, /No text, letters or numbers anywhere/)
    assert.doesNotMatch(prompt, /Text panel/)
    assert.deepEqual(refIndexes, [0])
  }
})

test("índice fora de 0..19 lança erro [BOOKS]", () => {
  assert.throws(() => buildPagePrompt({ theme: oDiaDaVacina, child: samuel, index: 20 }), /\[BOOKS\]/)
  assert.throws(() => buildPagePrompt({ theme: oDiaDaVacina, child: samuel, index: -1 }), /\[BOOKS\]/)
})

test("todo tema tem 17 páginas, textos de 20 a 36 palavras, sem travessão, sem aspas e sem placeholders sobrando", () => {
  for (const theme of Object.values(BOOK_THEMES)) {
    assert.equal(theme.pages.length, STORY_PAGE_COUNT, theme.slug)
    for (const child of [samuel, alice]) {
      for (let index = 0; index < BOOK_PAGE_COUNT; index++) {
        const { prompt } = buildPagePrompt({ theme, child, index })
        assert.doesNotMatch(prompt, /[{}[\]]/, `${theme.slug} p${index}: ${prompt.slice(0, 80)}`)
      }
    }
    for (const page of theme.pages) {
      const words = page.text.trim().split(/\s+/).length
      assert.ok(words >= 20 && words <= 36, `${theme.slug}: ${words} palavras em "${page.text.slice(0, 40)}"`)
      assert.doesNotMatch(page.text, /[—–"“”]/, `${theme.slug}: ${page.text.slice(0, 40)}`)
      assert.doesNotMatch(page.text.replace(/\[[^\]]*\]/g, ""), /Dra\. Lia|doutora?\b/i, `${theme.slug}: nome fixo do pediatra em "${page.text.slice(0, 40)}"`)
      for (const r of page.refs) assert.ok(r >= 0 && r <= 18, `${theme.slug}: ref ${r}`)
    }
  }
})
