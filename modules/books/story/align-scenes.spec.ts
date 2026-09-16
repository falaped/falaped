import test from "node:test"
import assert from "node:assert/strict"

import { alignScenes, castName, dropOrphanTokens } from "@/modules/books/story/align-scenes"
import { baseStoryPages } from "@/modules/books/story/generate-story"
import { oDiaDaVacina as theme } from "@/modules/books/themes/o-dia-da-vacina"

const child = { name: "Alice", gender: "menina" as const }
const cast = [
  { key: "pet", label: "Pipoca, pug de estimação da criança", name: "Pipoca", description: "a small fawn pug with a red collar" },
  { key: "rel1", label: "Vovó Nice", description: "an elderly woman with white curly hair" },
]
const SCENE_NEW = "Bright kitchen at breakfast, morning light through the window; Alice stands on a chair by the counter, laughing, while {{pet}} jumps up at her feet trying to reach a piece of bread. Warm colors, tender mood."

function base() {
  const pages = baseStoryPages(theme, child)
  pages[1] = { ...pages[1], text: "No café da manhã, Alice mexeu o cereal sem comer. A Pipoca deitou no pé dela, quietinha, como se soubesse que hoje era dia de vacina.", scene: `${pages[1].scene.replace(/\.$/, "")}; {{pet}} lies on her feet under the table.` }
  return { cast, pages }
}

function fake(outputs: string[]) {
  const calls: string[] = []
  const complete = async (_system: string, user: string) => {
    calls.push(user)
    return outputs.shift() ?? ""
  }
  return { complete, calls }
}

test("castName usa name ou a última palavra do rótulo", () => {
  assert.equal(castName(cast[0]), "Pipoca")
  assert.equal(castName(cast[1]), "Nice")
  assert.equal(castName({ key: "rel2", label: "Irmã Lara (mais velha)", description: "x" }), "Lara")
})

test("dropOrphanTokens tira só a oração do extra", () => {
  assert.equal(dropOrphanTokens("kitchen at breakfast; soft light; {{pet}} lies under the table.", ["pet"]), "kitchen at breakfast; soft light.")
  assert.equal(dropOrphanTokens("kitchen; {{pet}} sleeps.", []), "kitchen; {{pet}} sleeps.")
})

test("sem página alterada não chama o modelo", async () => {
  const story = base()
  const f = fake([])
  const out = await alignScenes({ story, changed: [{ position: 1, previousText: story.pages[1].text }] }, f)
  assert.equal(f.calls.length, 0)
  assert.deepEqual(out.aligned, [])
})

test("cena válida substitui a atual e só as páginas alteradas vão ao modelo", async () => {
  const story = base()
  story.pages[1] = { ...story.pages[1], text: "No café da manhã, Alice subiu na cadeira rindo enquanto a Pipoca pulava nos pés dela querendo um pedaço de pão. Hoje era dia de vacina." }
  const f = fake([JSON.stringify({ pages: [{ index: 3, scene: SCENE_NEW }] })])
  const out = await alignScenes({ story, changed: [{ position: 1, previousText: "texto antigo" }, { position: 4, previousText: story.pages[4].text }] }, f)
  assert.equal(f.calls.length, 1)
  const sent = JSON.parse(f.calls[0])
  assert.deepEqual(sent.pages.map((p: { index: number }) => p.index), [3])
  assert.equal(sent.pages[0].newText, story.pages[1].text)
  assert.deepEqual(out.aligned, [1])
  assert.equal(out.story.pages[1].scene, SCENE_NEW)
  assert.equal(out.story.pages[4].scene, story.pages[4].scene)
})

test("texto que tirou o extra: a oração dele sai da cena antes do modelo e cena com o token é recusada", async () => {
  const story = base()
  story.pages[1] = { ...story.pages[1], text: "No café da manhã, Alice mexeu o cereal sem comer, olhando pela janela e pensando na vacina que viria mais tarde naquele dia." }
  const f = fake([JSON.stringify({ pages: [{ index: 3, scene: SCENE_NEW }] })])
  const out = await alignScenes({ story, changed: [{ position: 1, previousText: "antigo" }] }, f)
  assert.deepEqual(out.aligned, [])
  assert.doesNotMatch(out.story.pages[1].scene, /\{\{pet\}\}/)
  assert.doesNotMatch(JSON.parse(f.calls[0]).pages[0].scene, /\{\{pet\}\}/, "a cena enviada já vai sem a Pipoca")
})

test("cenas inválidas mantêm a atual: curta demais, token desconhecido, índice não alterado", async () => {
  const story = base()
  story.pages[1] = { ...story.pages[1], text: "No café da manhã, Alice subiu na cadeira rindo enquanto a Pipoca pulava nos pés dela querendo um pedaço de pão. Hoje era dia de vacina." }
  const f = fake([JSON.stringify({ pages: [{ index: 3, scene: "kitchen." }, { index: 3, scene: SCENE_NEW.replace("{{pet}}", "{{dragon}}") }, { index: 5, scene: SCENE_NEW }] })])
  const out = await alignScenes({ story, changed: [{ position: 1, previousText: "antigo" }] }, f)
  assert.deepEqual(out.aligned, [])
  assert.equal(out.story.pages[1].scene, story.pages[1].scene)
  assert.equal(out.story.pages[3].scene, story.pages[3].scene)
})

test("JSON inválido duas vezes lança [BOOKS]", async () => {
  const story = base()
  story.pages[1] = { ...story.pages[1], text: "Texto novo com a Pipoca correndo pela cozinha e Alice rindo alto na cadeira." }
  await assert.rejects(alignScenes({ story, changed: [{ position: 1, previousText: "antigo" }] }, fake(["x", "{"])), /\[BOOKS\]/)
})
