import type { SupabaseClient } from "@supabase/supabase-js"

import { BOOK_PAGE_COUNT, COVER_INDEX } from "@/modules/books/constants"
import { generateAndStorePage } from "@/modules/books/generate-and-store-page"
import { buildPagePrompt } from "@/modules/books/prompts/build-page-prompt"
import { getBookTheme } from "@/modules/books/themes"
import type { Book, BookPage } from "@/modules/books/types"

export type GeneratePagesResult = { ready: number[]; failed: number[] }

/**
 * Gera todas as páginas 1..19 que ainda não estão `ready`, em ondas: uma
 * página só entra na onda quando todas as suas referências (capa e âncoras)
 * já existem. Páginas da mesma onda rodam em paralelo (allSettled). Marca o
 * livro `generating` → `ready` (todas prontas) ou `failed` (alguma falhou;
 * chamar de novo retoma só as pendentes).
 */
export async function generatePages(
  supabase: SupabaseClient,
  book: Book,
  existingPages: BookPage[],
  replicateToken: string,
): Promise<GeneratePagesResult> {
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

  while (pending.size) {
    const wave = [...pending].filter(([, refs]) => refs.every((r) => ready.has(r))).map(([i]) => i)
    if (!wave.length) {
      // Referências que falharam bloqueiam as dependentes: marca como failed sem gastar.
      for (const [index] of pending) failed.push(index)
      break
    }
    const results = await Promise.allSettled(
      wave.map((index) => generateAndStorePage(supabase, book, index, replicateToken)),
    )
    results.forEach((r, i) => {
      const index = wave[i]
      pending.delete(index)
      if (r.status === "fulfilled") {
        ready.add(index)
        done.push(index)
      } else failed.push(index)
    })
  }

  const status = failed.length ? "failed" : "ready"
  await supabase.from("books").update({ status, updated_at: new Date().toISOString() }).eq("id", book.id)
  return { ready: done.sort((a, b) => a - b), failed: failed.sort((a, b) => a - b) }
}
