import type { BookDetails, BookStory, BookStoryPage } from "@/lib/schemas/book"
import { FIRST_STORY_INDEX, STORY_PAGE_COUNT } from "@/modules/books/constants"
import { renderBookText, type BookChild } from "@/modules/books/render-book-text"
import { countWords, STORY_FORBIDDEN_CHARS, STORY_MAX_WORDS, STORY_MIN_WORDS } from "@/modules/books/story/rules"
import type { BookTheme } from "@/modules/books/themes/types"

/** Chamada ao modelo de texto: recebe system e user, devolve o JSON bruto. Injetável nos testes. */
export type StoryCompletion = (system: string, user: string) => Promise<string>

export type GenerateStoryDeps = { complete: StoryCompletion }

export type StoryCastSeed = { key: string; label: string; name: string }

/** Máximo de páginas em que cada extra pode aparecer; acima disso a página volta à original. */
export const MAX_PAGES_PER_EXTRA = 3
/** Máximo de páginas alteradas no total: a história continua sendo a do tema, com toques pessoais. */
export const MAX_CHANGED_PAGES = 8

/** Cada detalhe do formulário vira um membro do elenco extra com uma chave para o token `{{key}}` da cena. */
export function castFromDetails(details: BookDetails): StoryCastSeed[] {
  const cast: StoryCastSeed[] = []
  if (details.pet) cast.push({ key: "pet", label: `${details.pet.name}, ${details.pet.kind} de estimação da criança`, name: details.pet.name })
  details.relatives?.forEach((r, i) => {
    const role = r.role.charAt(0).toUpperCase() + r.role.slice(1)
    cast.push({ key: `rel${i + 1}`, label: `${role} ${r.name}${r.note ? ` (${r.note})` : ""}`, name: r.name })
  })
  if (details.favoriteToy) cast.push({ key: "toy", label: `${details.favoriteToy}, brinquedo favorito da criança`, name: details.favoriteToy })
  return cast
}

/** As 17 páginas do tema já com nome, gênero e pediatra aplicados. Base quando não há IA ou quando ela falha. */
export function baseStoryPages(theme: BookTheme, child: BookChild): BookStoryPage[] {
  return theme.pages.map((p) => ({ text: renderBookText(p.text, child), scene: renderBookText(p.scene, child), panel: p.panel }))
}

const SYSTEM_PROMPT = `Você adapta histórias infantis ilustradas (3 a 6 anos) em português do Brasil. Recebe as 17 páginas de uma história pronta e detalhes da vida da criança (animal de estimação, familiares, brinquedo). Sua tarefa é encaixar esses detalhes na história de forma natural, mantendo o arco, a ordem dos acontecimentos e a dica do pediatra intactos.

Regras obrigatórias:
- Cada personagem extra aparece em no máximo 3 páginas, e no total no máximo 8 páginas mudam, só onde o personagem tem um papel natural (quem leva a criança, quem consola, quem comemora). Não force. Páginas sem lugar natural ficam como estão e NÃO devem ser devolvidas.
- Em toda página devolvida, o campo "text" é OBRIGATORIAMENTE um texto novo que cita o personagem extra pelo nome (ex.: Pipoca, Vovó Nice) fazendo algo concreto na história. Para isso, mantenha as frases originais que couberem e acrescente ou troque uma frase curta com o personagem. Um "text" igual ao original é descartado, e a página inteira se perde. Exemplo: original "Naquela manhã, Samuel acordou com o sol no rosto e um aviso da mamãe: hoje era dia de vacina." → novo "Naquela manhã, Samuel acordou com o sol no rosto e a Pipoca lambendo seu pé. A mamãe avisou: hoje era dia de vacina."
- O campo "addition" da mesma página deve conter o token do mesmo personagem citado no texto.
- Texto de cada página: 20 a 36 palavras, frases curtas, tom afetuoso e concreto. Sem travessão, sem aspas, sem chaves. Pode usar dois-pontos e reticências. Mantenha o nome da criança e do pediatra exatamente como estão.
- Não reescreva a cena. Devolva em "addition" UMA frase curta em inglês (até 25 palavras) que será acrescentada ao fim da cena original, dizendo onde o personagem extra está e o que faz, pelo resultado físico. Refira-se a ele APENAS pelo token, por exemplo {{pet}} ou {{rel1}}, sem nome nem rótulo depois do token (o token vira a descrição completa). Exemplo: "{{pet}} lies curled at the foot of the bed, tail wagging". Nunca invente pessoas fora do elenco.
- Para cada chave de elenco que você usar, devolva em "cast" uma descrição visual fixa em inglês (aparência, cores, roupa ou pelagem, tamanho relativo à criança), sem nome, para o ilustrador repetir igual em todas as páginas. Exemplo: "a small fawn pug with a black muzzle, a red collar and a curly tail".
- O texto livre "extra" pode inspirar detalhes pequenos, mas nunca muda o tema.

Saída: JSON estrito, sem comentários, no formato {"cast":[{"key":"pet","description":"..."}],"pages":[{"index":2,"text":"<texto NOVO citando o extra pelo nome>","addition":"{{pet}} <o que faz na cena>"}]}. Devolva SOMENTE as páginas alteradas. Se nenhum detalhe couber, devolva {"cast":[],"pages":[]}.`

type RawOutput = {
  cast?: { key?: unknown; description?: unknown }[]
  pages?: { index?: unknown; text?: unknown; addition?: unknown }[]
}

function stripFences(raw: string) {
  return raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim()
}

const TOKEN = /\{\{([a-z][a-z0-9]*)\}\}/g

export function tokensIn(scene: string): string[] {
  return [...scene.matchAll(TOKEN)].map((m) => m[1])
}

/**
 * Gera a história personalizada: renderiza as páginas do tema, pede ao
 * modelo de texto que encaixe o elenco extra e valida página a página. Toda
 * página inválida (contagem, caracteres, tokens desconhecidos) volta à
 * original. Sem detalhes, devolve a história do tema sem chamar o modelo.
 */
export async function generateStory(
  input: { theme: BookTheme; child: BookChild; details: BookDetails },
  { complete }: GenerateStoryDeps,
): Promise<BookStory> {
  const { theme, child, details } = input
  const base = baseStoryPages(theme, child)
  const seeds = castFromDetails(details)
  if (!seeds.length && !details.extra) return { cast: [], pages: base }

  const user = JSON.stringify({
    child: { name: child.name.trim(), gender: child.gender },
    cast: seeds,
    extra: details.extra ?? null,
    pages: base.map((p, i) => ({ index: i + FIRST_STORY_INDEX, text: p.text, scene: p.scene })),
  })

  let raw: RawOutput | null = null
  for (let attempt = 1; attempt <= 2 && !raw; attempt++) {
    try {
      raw = JSON.parse(stripFences(await complete(SYSTEM_PROMPT, user))) as RawOutput
    } catch {
      if (attempt === 2) throw new Error("[BOOKS] O modelo de texto não devolveu uma história válida. Tente de novo.")
    }
  }

  const known = new Set(seeds.map((s) => s.key))
  const descriptions = new Map<string, string>()
  for (const c of raw?.cast ?? []) {
    if (typeof c.key === "string" && known.has(c.key) && typeof c.description === "string" && c.description.trim().length >= 3)
      descriptions.set(c.key, c.description.trim().slice(0, 300))
  }

  const pages = [...base]
  for (const p of raw?.pages ?? []) {
    const index = typeof p.index === "number" ? p.index : Number(p.index)
    const pos = index - FIRST_STORY_INDEX
    if (!Number.isInteger(pos) || pos < 0 || pos >= STORY_PAGE_COUNT) continue
    if (typeof p.text !== "string" || typeof p.addition !== "string") continue
    // Hífen tipográfico e soft hyphen viram hífen comum: o modelo de imagem erra com eles.
    const text = p.text.trim().replace(/[\u2011\u00AD]/g, "-")
    const addition = p.addition.trim().replace(/[.;\s]+$/, "")
    const words = countWords(text)
    if (words < STORY_MIN_WORDS || words > STORY_MAX_WORDS) continue
    if (STORY_FORBIDDEN_CHARS.test(text) || /[{}]/.test(text)) continue
    if (!addition || addition.length > 240 || /[{}]/.test(addition.replace(TOKEN, ""))) continue
    // A cena original fica intacta; o acréscimo entra no fim.
    const scene = `${base[pos].scene.trim().replace(/[.;]+$/, "")}; ${addition}.`
    const keys = tokensIn(addition)
    if (!keys.length || text === base[pos].text) continue
    if (!keys.every((k) => descriptions.has(k))) continue
    // Texto e cena alinhados: cada extra desenhado é citado pelo nome no texto.
    if (!keys.every((k) => text.toLowerCase().includes(seeds.find((s) => s.key === k)!.name.toLowerCase()))) continue
    pages[pos] = { text, scene, panel: base[pos].panel }
  }

  // Tetos: por extra e no total. Primeiro garante a primeira aparição de cada extra, depois preenche em ordem.
  const changed = pages.map((p, pos) => pos).filter((pos) => tokensIn(pages[pos].scene).length)
  const keep = new Set<number>()
  const perKey = new Map<string, number>()
  const admit = (pos: number) => {
    const keys = tokensIn(pages[pos].scene)
    if (keep.size >= MAX_CHANGED_PAGES || keys.some((k) => (perKey.get(k) ?? 0) >= MAX_PAGES_PER_EXTRA)) return
    keep.add(pos)
    keys.forEach((k) => perKey.set(k, (perKey.get(k) ?? 0) + 1))
  }
  for (const seed of seeds) {
    const first = changed.find((pos) => tokensIn(pages[pos].scene).includes(seed.key))
    if (first !== undefined && !keep.has(first)) admit(first)
  }
  changed.forEach((pos) => { if (!keep.has(pos)) admit(pos) })
  changed.forEach((pos) => { if (!keep.has(pos)) pages[pos] = base[pos] })

  const used = new Set(pages.flatMap((p) => tokensIn(p.scene)))
  const cast = seeds.filter((s) => used.has(s.key)).map((s) => ({ key: s.key, label: s.label, name: s.name, description: descriptions.get(s.key)! }))
  return { cast, pages }
}
