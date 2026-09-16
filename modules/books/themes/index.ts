import type { BookTheme } from "@/modules/books/themes/types"
import { adeusChupeta } from "@/modules/books/themes/adeus-chupeta"
import { adeusFralda } from "@/modules/books/themes/adeus-fralda"
import { chegouOIrmaozinho } from "@/modules/books/themes/chegou-o-irmaozinho"
import { comerDeTudo } from "@/modules/books/themes/comer-de-tudo"
import { dormirNaPropriaCama } from "@/modules/books/themes/dormir-na-propria-cama"
import { escovarOsDentes } from "@/modules/books/themes/escovar-os-dentes"
import { feECoragem } from "@/modules/books/themes/fe-e-coragem"
import { oDiaDaVacina } from "@/modules/books/themes/o-dia-da-vacina"
import { primeiroDiaNaEscola } from "@/modules/books/themes/primeiro-dia-na-escola"
import { visitaAoPediatra } from "@/modules/books/themes/visita-ao-pediatra"

export type { BookTheme, BookStoryPage } from "@/modules/books/themes/types"

/** Temas disponíveis, indexados por slug, na ordem exibida no formulário. Temas vivem em código, não no banco. */
export const BOOK_THEMES: Record<string, BookTheme> = Object.fromEntries(
  [
    oDiaDaVacina,
    dormirNaPropriaCama,
    visitaAoPediatra,
    feECoragem,
    adeusFralda,
    adeusChupeta,
    escovarOsDentes,
    comerDeTudo,
    chegouOIrmaozinho,
    primeiroDiaNaEscola,
  ].map((t) => [t.slug, t]),
)

export function getBookTheme(slug: string): BookTheme {
  const theme = BOOK_THEMES[slug]
  if (!theme) throw new Error(`[BOOKS] Tema desconhecido: ${slug}`)
  return theme
}
