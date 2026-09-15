import type { BookTheme } from "@/modules/books/themes/types"
import { visitaAoPediatra } from "@/modules/books/themes/visita-ao-pediatra"

export type { BookTheme, BookPage } from "@/modules/books/themes/types"

/** Temas disponíveis, indexados por slug. Temas vivem em código, não no banco. */
export const BOOK_THEMES: Record<string, BookTheme> = {
  [visitaAoPediatra.slug]: visitaAoPediatra,
}
