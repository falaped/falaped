import { renderBookText, type BookChild } from "@/modules/books/render-book-text"
import {
  COVER_INDEX,
  DEDICATION_INDEX,
  ENDING_INDEX,
  FIRST_STORY_INDEX,
  STORY_PAGE_COUNT,
} from "@/modules/books/constants"
import type { BookTheme } from "@/modules/books/themes/types"

export type BuildPagePromptInput = {
  theme: BookTheme
  child: BookChild
  /** 0..19 */
  index: number
}

export type BuiltPagePrompt = {
  prompt: string
  /** Índices de páginas já geradas a enviar como referência, capa primeiro. Vazio na capa. */
  refIndexes: number[]
}

// Blocos fixos validados nos livros de teste (ver memória book-prompt-rules e issue #12).
const STYLE =
  "Children's picture book illustration in a stylized 3D animated look (Pixar/DreamWorks feature film). This is clearly a cartoon and NOT a photograph: smooth simplified skin with no pores or photographic texture, slightly enlarged expressive eyes, soft rounded shapes, painterly warm lighting, rich saturated colors, gentle depth of field. Every character's face and body share the same degree of stylization and the proportions of an animated child or adult (a child's head is about one quarter of body height), so heads sit naturally on bodies. Portrait 3:4, full-bleed, no frame, no watermark. Every book, poster, chart, box, label, screen and sign in the scene is blank, with no letters or numbers on any object. The scene contains ONLY the people named in the scene description; no extra people, children or faces in the background."

const CONSISTENCY =
  "The input image right after the photos is the book cover already generated: reproduce the main character exactly as drawn there (same stylized face, hair, outfit, colors and proportions). Each further input image is a page already generated showing a secondary character or element; that character or element must look identical to that page (same face, hair, clothes and colors)."

const NO_TEXT =
  "No text, letters or numbers anywhere in the image; the illustration fills the image edge to edge with no blank or flat bands."

function characterBlock(theme: BookTheme, child: BookChild) {
  return renderBookText(
    `Main character: the {boy|girl} from the reference photos (the first input images), translated into this animated style while keeping {his|her} recognizable features: the hair style and color, skin tone, eye color, face shape and smile seen in the photos. Outfit in every scene, different from the photos: ${theme.outfit}.`,
    child,
  )
}

function textPanel(position: "upper" | "lower", text: string) {
  return `Text panel: in the ${position} third of the image, a translucent deep-navy rounded rectangle with a thin cream border and one small cream star centered on its top edge. The whole panel, including its border, sits completely inside the image with a clear margin of at least 8% of the image height from the top or bottom edge and 6% of the width from the sides; no part of the panel touches or crosses the image border. Inside it, EXACTLY the following Portuguese text, character by character with accents and punctuation, in an elegant cream serif typeface (Cormorant Garamond style), centered, large and fully legible. Every word appears once; nothing else is written anywhere in the image: "${text}"`
}

function coverBlock(title: string, subtitle: string) {
  return `Cover layout: in the upper third, the title in big embossed golden 3D letters, rendered EXACTLY: "${title}". Right below it, the subtitle in small cream serif, rendered EXACTLY and only once: "${subtitle}". All lettering sits completely inside the image with a clear margin from every edge. Nothing else is written anywhere.`
}

/**
 * Monta o prompt do gpt-image-2 para uma página do livro e diz quais páginas
 * já geradas entram como referência. Função pura: sem I/O.
 * 0 = capa (título na imagem); 1 = dedicatória e 19 = final (sem texto, o
 * pdfkit escreve por cima); 2..18 = história (texto dentro da imagem).
 */
export function buildPagePrompt({ theme, child, index }: BuildPagePromptInput): BuiltPagePrompt {
  const r = (t: string) => renderBookText(t, child)
  const character = characterBlock(theme, child)

  if (index === COVER_INDEX) {
    return {
      prompt: `${STYLE} ${character} Scene: ${r(theme.coverScene)} ${coverBlock(r(theme.title), r(theme.subtitle))}`,
      refIndexes: [],
    }
  }
  if (index === DEDICATION_INDEX) {
    return {
      prompt: `${STYLE} ${character} ${CONSISTENCY} Scene: ${r(theme.dedicationScene)} ${NO_TEXT}`,
      refIndexes: [COVER_INDEX],
    }
  }
  if (index === ENDING_INDEX) {
    return {
      prompt: `${STYLE} ${character} ${CONSISTENCY} Scene: ${r(theme.endingScene)} ${NO_TEXT}`,
      refIndexes: [COVER_INDEX],
    }
  }

  const storyPosition = index - FIRST_STORY_INDEX
  if (storyPosition < 0 || storyPosition >= STORY_PAGE_COUNT)
    throw new Error(`[BOOKS] Índice de página inválido: ${index}`)
  const page = theme.pages[storyPosition]
  if (!page) throw new Error(`[BOOKS] Tema ${theme.slug} não tem a página ${index}`)

  const refIndexes = [COVER_INDEX, ...page.refs.filter((i) => i !== COVER_INDEX && i < index)]
  return {
    prompt: `${STYLE} ${character} ${CONSISTENCY} Scene: ${r(page.scene)} ${textPanel(page.panel, r(page.text))}`,
    refIndexes,
  }
}
