import type { BookQuality, BookStatus } from "@/modules/books/constants"
import type { BookGender } from "@/modules/books/render-book-text"
import type { BookDetails, BookStory } from "@/lib/schemas/book"

export type Book = {
  id: string
  /** Dono no Falaped. Null em livro de lead ainda não reivindicado pelo gestor. */
  profile_id: string | null
  /** Lead da landing pública (book_leads.id). Null em livro criado por pediatra. */
  lead_id: string | null
  child_name: string
  child_gender: BookGender
  theme: string
  status: BookStatus
  quality: BookQuality
  photo_paths: string[]
  dedication: string | null
  pediatrician_name: string | null
  pediatrician_logo_path: string | null
  /** Detalhes do formulário (pet, familiares, brinquedo). Null = livro sem personalização. */
  details: BookDetails | null
  /** História final revisada pelo usuário. Null = usa o texto do tema. */
  story: BookStory | null
  pdf_path: string | null
  /** Pedido da landing: quando o comprador foi avisado por e-mail que entrou em produção. */
  notified_at: string | null
  /** Pedido da landing: quando o PDF foi enviado ao comprador pelo WhatsApp. */
  delivered_at: string | null
  created_at: string
  updated_at: string
}

export type BookPageStatus = "pending" | "ready" | "failed"

export type BookPage = {
  book_id: string
  index: number
  image_path: string | null
  status: BookPageStatus
  error: string | null
  prompt: string | null
  updated_at: string
}

export type BookWithPages = Book & { pages: BookPage[] }

export const BOOK_SELECT =
  "id, profile_id, lead_id, child_name, child_gender, theme, status, quality, photo_paths, dedication, pediatrician_name, pediatrician_logo_path, details, story, pdf_path, notified_at, delivered_at, created_at, updated_at"

export const BOOK_PAGE_SELECT = "book_id, index, image_path, status, error, prompt, updated_at"

export type BookLeadStatus = "new" | "cover_ready" | "checkout" | "paid"

export type BookLead = {
  id: string
  email: string
  first_name: string
  last_name: string
  whatsapp: string
  consent_at: string
  ip: string | null
  /** Cupom de indicação validado (BOOK_COUPONS). */
  coupon: string | null
  status: BookLeadStatus
  created_at: string
  updated_at: string
}

export const BOOK_LEAD_SELECT = "id, email, first_name, last_name, whatsapp, consent_at, ip, coupon, status, created_at, updated_at"
