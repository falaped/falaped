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

/** Paths no bucket book-assets. */
export const bookPhotoPath = (bookId: string, n: number, ext: string) =>
  `${bookId}/photos/${n}.${ext}`
export const bookPagePath = (bookId: string, index: number) =>
  `${bookId}/pages/${index}.png`
export const bookPdfPath = (bookId: string) => `${bookId}/book.pdf`
