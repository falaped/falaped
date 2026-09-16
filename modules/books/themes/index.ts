import type { BookTheme } from "@/modules/books/themes/types"
import { oDiaDaVacina } from "@/modules/books/themes/o-dia-da-vacina"

export type { BookTheme, BookStoryPage } from "@/modules/books/themes/types"

/** Temas disponíveis, indexados por slug. Temas vivem em código, não no banco. */
export const BOOK_THEMES: Record<string, BookTheme> = {
  [oDiaDaVacina.slug]: oDiaDaVacina,
}

export function getBookTheme(slug: string): BookTheme {
  const theme = BOOK_THEMES[slug]
  if (!theme) throw new Error(`[BOOKS] Tema desconhecido: ${slug}`)
  return theme
}
