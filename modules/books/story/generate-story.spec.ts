import test from "node:test"
import assert from "node:assert/strict"

import { buildPagePrompt } from "@/modules/books/prompts/build-page-prompt"
import { baseStoryPages, castFromDetails, generateStory } from "@/modules/books/story/generate-story"
import { oDiaDaVacina as theme } from "@/modules/books/themes/o-dia-da-vacina"

const child = { name: "Alice", gender: "menina" as const, pediatricianName: "Dr. Marcos" }
const details = { pet: { kind: "pug", name: "Pipoca" }, relatives: [{ role: "vovó" as const, name: "Nice", note: null }], favoriteToy: null, extra: null }

const TEXT_OK = "No café da manhã, Alice mexeu o cereal sem comer. A Pipoca deitou no pé dela, quietinha, como se soubesse que hoje era dia de vacina e de coragem."

function fake(outputs: string[]) {
  const calls: { system: string; user: string }[] = []
  const complete = async (system: string, user: string) => {
    calls.push({ system, user })
    return outputs.shift() ?? ""
  }
  return { complete, calls }
}

test("elenco sai dos detalhes com chaves estáveis", () => {
  assert.deepEqual(
    castFromDetails(details).map((c) => c.key),
    ["pet", "rel1"],
  )
  assert.match(castFromDetails(details)[1].label, /^Vovó Nice/)
})

test("sem detalhes não chama o modelo e devolve o tema renderizado", async () => {
  const f = fake([])
  const story = await generateStory({ theme, child, details: { relatives: [], pet: null, favoriteToy: null, extra: null } }, f)
  assert.equal(f.calls.length, 0)
  assert.equal(story.pages.length, 17)
  assert.deepEqual(story.cast, [])
  assert.match(story.pages[0].text, /^Naquela manhã, Alice acordou/)
  assert.doesNotMatch(story.pages.map((p) => p.text + p.scene).join(""), /[{}]/)
})

test("página válida do modelo substitui a original; elenco só com chaves usadas", async () => {
  const f = fake([
    JSON.stringify({
      cast: [
        { key: "pet", description: "a small fawn pug with a black muzzle and a red collar" },
        { key: "rel1", description: "an elderly woman with white curly hair and a green cardigan" },
      ],
      pages: [{ index: 3, text: TEXT_OK, addition: "{{pet}} lies on her feet under the table." }],
    }),
  ])
  const story = await generateStory({ theme, child, details }, f)
  assert.equal(f.calls.length, 1)
  assert.match(f.calls[0].user, /"Pipoca, pug de estimação da criança"/)
  assert.equal(story.pages[1].text, TEXT_OK)
  assert.match(story.pages[1].scene, /^bright kitchen at breakfast;.*tenderness; \{\{pet\}\} lies on her feet under the table\.$/, "cena original intacta + acréscimo")
  assert.equal(story.pages[1].panel, "lower")
  assert.deepEqual(story.cast.map((c) => c.key), ["pet"])
  assert.equal(story.pages[0].text, baseStoryPages(theme, child)[0].text)
})

test("páginas inválidas voltam à original: palavras demais, aspas, token desconhecido, índice fora", async () => {
  const f = fake([
    JSON.stringify({
      cast: [{ key: "pet", description: "a small fawn pug" }],
      pages: [
        { index: 4, text: Array(40).fill("Pipoca").join(" "), addition: "{{pet}} sits" },
        { index: 5, text: `${TEXT_OK.slice(0, -1)} "ok".`, addition: "{{pet}} sits" },
        { index: 6, text: TEXT_OK, addition: "{{dragao}} flies" },
        { index: 7, text: TEXT_OK.replace("Pipoca", "Bolinha"), addition: "{{pet}} sits" },
        { index: 40, text: TEXT_OK, addition: "{{pet}} sits" },
      ],
    }),
  ])
  const story = await generateStory({ theme, child, details }, f)
  const base = baseStoryPages(theme, child)
  for (const pos of [2, 3, 4, 5]) assert.equal(story.pages[pos].text, base[pos].text, `página ${pos + 2}`)
  assert.deepEqual(story.cast, [])
})

test("tetos: cada extra até 3 páginas e 8 no total, garantindo a primeira aparição de cada um", async () => {
  const manyDetails = { ...details, relatives: [{ role: "vovó" as const, name: "Nice", note: null }, { role: "vovô" as const, name: "Geraldinho", note: null }] }
  const pagesOut = []
  for (let index = 2; index <= 18; index++) {
    const key = index < 12 ? "pet" : index < 17 ? "rel1" : "rel2"
    const name = key === "pet" ? "Pipoca" : key === "rel1" ? "Vovó Nice" : "Vovô Geraldinho"
    pagesOut.push({ index, text: `${name} chegou perto e ficou ali. ${TEXT_OK.split(". ")[0]}. ${TEXT_OK.split(". ")[1]}`, addition: `{{${key}}} sits close` })
  }
  const f = fake([JSON.stringify({ cast: [{ key: "pet", description: "a pug" }, { key: "rel1", description: "an old lady" }, { key: "rel2", description: "an old man" }], pages: pagesOut })])
  const story = await generateStory({ theme, child, details: manyDetails }, f)
  const base = baseStoryPages(theme, child)
  const changed = story.pages.filter((p, i) => p.text !== base[i].text)
  assert.equal(changed.length, 8)
  const count = (k: string) => story.pages.filter((p) => p.scene.includes(`{{${k}}}`)).length
  assert.equal(count("pet"), 3)
  assert.equal(count("rel1"), 3)
  assert.equal(count("rel2"), 2, "rel2 só tinha 2 páginas e todas entram porque a 1ª aparição é garantida")
  assert.deepEqual(story.cast.map((c) => c.key), ["pet", "rel1", "rel2"])
})

test("JSON inválido duas vezes lança erro [BOOKS]; uma vez, tenta de novo", async () => {
  await assert.rejects(generateStory({ theme, child, details }, fake(["nope", "{"])), /\[BOOKS\]/)
  const f = fake(["```json\nnão\n```", JSON.stringify({ cast: [], pages: [] })])
  const story = await generateStory({ theme, child, details }, f)
  assert.equal(f.calls.length, 2)
  assert.equal(story.pages.length, 17)
})

test("buildPagePrompt com história: texto e cena da história, token vira descrição, âncora do extra entra nas refs", () => {
  const base = baseStoryPages(theme, child)
  const pages = [...base]
  pages[1] = { ...pages[1], scene: "kitchen; {{pet}} sleeps under the table." }
  pages[5] = { ...pages[5], text: TEXT_OK, scene: "waiting room; {{pet}} waits by the door." }
  const story = { cast: [{ key: "pet", label: "Pipoca", description: "a small fawn pug with a red collar" }], pages }

  const p3 = buildPagePrompt({ theme, child, index: 3, story })
  assert.match(p3.prompt, /a small fawn pug with a red collar/)
  assert.doesNotMatch(p3.prompt, /\{\{/)
  assert.deepEqual(p3.refIndexes, [0, 2])

  const p7 = buildPagePrompt({ theme, child, index: 7, story })
  assert.match(p7.prompt, new RegExp(TEXT_OK.slice(0, 30)))
  assert.deepEqual(p7.refIndexes, [0, 2, 3], "âncora da Pipoca (p.3) entra depois das refs do tema")

  const p4 = buildPagePrompt({ theme, child, index: 4, story })
  assert.deepEqual(p4.refIndexes, buildPagePrompt({ theme, child, index: 4 }).refIndexes, "página sem extra não muda")
})
