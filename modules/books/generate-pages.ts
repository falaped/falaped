import type { SupabaseClient } from "@supabase/supabase-js"

import { BOOK_PAGE_COUNT, COVER_INDEX } from "@/modules/books/constants"
import { generateAndStorePage } from "@/modules/books/generate-and-store-page"
import { buildPagePrompt } from "@/modules/books/prompts/build-page-prompt"
import { getBookTheme } from "@/modules/books/themes"
import type { Book, BookPage } from "@/modules/books/types"

export type GeneratePagesResult = { ready: number[]; failed: number[]; pending: number[] }

export type GeneratePagesOptions = {
  /** Não inicia página nova depois deste tempo; o que sobrar volta em `pending` e o livro fica `generating`. */
  budgetMs?: number
  /** Páginas em paralelo. Replicate limita a ~6 pedidos/min com saldo baixo; 2 fica folgado. */
  concurrency?: number
  /** Injetável nos testes. */
  generatePage?: typeof generateAndStorePage
}

/**
 * Gera todas as páginas 1..19 que ainda não estão `ready` com no máximo
 * `concurrency` em paralelo: assim que uma termina, entra a próxima cuja
 * referências (capa e âncoras) já estejam prontas. Marca o livro
 * `generating` → `ready` (todas prontas) ou `failed` (alguma falhou; chamar
 * de novo retoma só as pendentes). Com `budgetMs`, não inicia página nova
 * depois do tempo (limite de execução da Vercel) e o chamador repete.
 */
export async function generatePages(
  supabase: SupabaseClient,
  book: Book,
  existingPages: BookPage[],
  replicateToken: string,
  { budgetMs, concurrency = 2, generatePage = generateAndStorePage }: GeneratePagesOptions = {},
): Promise<GeneratePagesResult> {
  const startedAt = Date.now()
  const ready = new Set(existingPages.filter((p) => p.status === "ready").map((p) => p.index))
  if (!ready.has(COVER_INDEX)) throw new Error("[BOOKS] Gere e aprove a capa antes das páginas.")

  const theme = getBookTheme(book.theme)
  const child = { name: book.child_name, gender: book.child_gender }
  const pending = new Map<number, number[]>()
  for (let index = 1; index < BOOK_PAGE_COUNT; index++) {
    if (!ready.has(index)) pending.set(index, buildPagePrompt({ theme, child, index }).refIndexes)
  }

  await supabase.from("books").update({ status: "generating", updated_at: new Date().toISOString() }).eq("id", book.id)
  const failed: number[] = []
  const done: number[] = []

  const running = new Map<number, Promise<void>>()
  const overBudget = () => Boolean(budgetMs && Date.now() - startedAt > budgetMs)

  while (pending.size || running.size) {
    const next = running.size < concurrency && !overBudget()
      ? [...pending].find(([, refs]) => refs.every((r) => ready.has(r)))
      : undefined
    if (next) {
      const [index] = next
      pending.delete(index)
      running.set(
        index,
        generatePage(supabase, book, index, replicateToken)
          .then(() => { ready.add(index); done.push(index) }, () => { failed.push(index) })
          .finally(() => running.delete(index)),
      )
      continue
    }
    if (running.size) {
      await Promise.race(running.values())
      continue
    }
    if (overBudget()) break
    // Referências que falharam bloqueiam as dependentes: marca como failed sem gastar.
    for (const [index] of pending) failed.push(index)
    pending.clear()
  }

  const left = [...pending.keys()].sort((a, b) => a - b)
  const status = left.length ? "generating" : failed.length ? "failed" : "ready"
  await supabase.from("books").update({ status, updated_at: new Date().toISOString() }).eq("id", book.id)
  return { ready: done.sort((a, b) => a - b), failed: failed.sort((a, b) => a - b), pending: left }
}
