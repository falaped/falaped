/** Livro = 20 páginas A4 retrato, índices 0..19 em `book_pages.index`. */
export const BOOK_PAGE_COUNT = 20
export const COVER_INDEX = 0
export const DEDICATION_INDEX = 1
export const FIRST_STORY_INDEX = 2
export const STORY_PAGE_COUNT = 17
export const ENDING_INDEX = 19

export const BOOK_QUALITIES = ["medium", "high"] as const
export type BookQuality = (typeof BOOK_QUALITIES)[number]

export const BOOK_STATUSES = ["draft", "cover_ready", "generating", "ready", "failed"] as const
export type BookStatus = (typeof BOOK_STATUSES)[number]

export const MAX_BOOK_PHOTOS = 2

/** Capas que um lead da landing pode gerar de graça, uma por tema. */
export const MAX_LEAD_COVERS = 3

/** Paths no bucket book-assets. */
export const bookPhotoPath = (bookId: string, n: number, ext: string) =>
  `${bookId}/photos/${n}.${ext}`
export const bookPagePath = (bookId: string, index: number) =>
  `${bookId}/pages/${index}.jpg`
export const bookPdfPath = (bookId: string) => `${bookId}/book.pdf`

/** Oferta da landing pública (decisão do gestor, 17/09/2026). */
export const BOOK_PRICE_BRL = "29,99"
/** Caixa que recebe as respostas: o domínio de envio (contato.falaped.com.br) não tem entrada. */
export const BOOKS_EMAIL_REPLY_TO = "contato@falaped.com.br"
/** WhatsApp da venda concierge (Pix), só dígitos com DDI. */
export const BOOKS_WHATSAPP = "5531997815503"
/** Cupons de indicação (código → % de desconto). Em código por enquanto: são 2. */
export const BOOK_COUPONS: Record<string, number> = { GABIMARINHO10: 10, MARIZINATO10: 10 }
/** Preço em BRL já com o desconto do cupom (ou cheio, se nulo/inválido). */
export function bookPriceWithCoupon(coupon: string | null | undefined): string {
  const pct = coupon ? BOOK_COUPONS[coupon] ?? 0 : 0
  const cents = Math.round(2999 * (1 - pct / 100))
  return (cents / 100).toFixed(2).replace(".", ",")
}
