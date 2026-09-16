import type { BookQuality, BookStatus } from "@/modules/books/constants"
import type { BookGender } from "@/modules/books/render-book-text"
import type { BookDetails, BookStory } from "@/lib/schemas/book"

export type Book = {
  id: string
  profile_id: string
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
  "id, profile_id, child_name, child_gender, theme, status, quality, photo_paths, dedication, pediatrician_name, pediatrician_logo_path, details, story, pdf_path, created_at, updated_at"

export const BOOK_PAGE_SELECT = "book_id, index, image_path, status, error, prompt, updated_at"
