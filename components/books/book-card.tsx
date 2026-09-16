import Link from "next/link"
import { BookOpen, Loader2 } from "lucide-react"

import { BookStatusSticker } from "@/components/books/book-status-sticker"
import { BrandBlur } from "@/components/books/books-ui"
import { BOOK_PAGE_COUNT } from "@/modules/books/constants"
import type { BookListItem } from "@/modules/books/list-books"
import { renderBookText } from "@/modules/books/render-book-text"
import { getBookTheme } from "@/modules/books/themes"

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

/** "12 set 2026", como no handoff. */
export function formatBookDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function BookCard({ book }: { book: BookListItem }) {
  const theme = getBookTheme(book.theme)
  const title = renderBookText(theme.title, { name: book.child_name, gender: book.child_gender })
  return (
    <Link
      href={`/books/${book.id}`}
      className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-ink bg-white text-ink no-underline shadow-hard-md transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_#17171a] focus-visible:outline-3 focus-visible:outline-offset-[3px] focus-visible:outline-warning"
    >
      <div className="relative aspect-[3/4] overflow-hidden border-b-2 border-ink bg-accent">
        {book.hasCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/books/${book.id}/pages/0?v=${encodeURIComponent(book.updated_at)}`}
            alt={`Capa de ${title}`}
            className="size-full object-cover"
          />
        ) : (
          <>
            <BrandBlur />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
              <BookOpen className="size-9" strokeWidth={2} aria-hidden />
              <span className="rounded-full border-2 border-ink bg-white px-2.5 py-1.5 text-[12.5px] font-bold">Sem capa ainda</span>
            </div>
          </>
        )}
        {book.status === "generating" && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-2 py-1 text-[11px] font-bold shadow-hard-sm">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            {book.readyCount}/{BOOK_PAGE_COUNT}
          </span>
        )}
        <BookStatusSticker status={book.status} className="absolute left-3 top-3 -rotate-4 text-[11.5px]" />
      </div>
      <div className="flex flex-col gap-1.5 px-4 pb-4 pt-3.5">
        <h3 className="font-display text-[22px] font-extrabold leading-[1.1] tracking-tight text-pretty">{title}</h3>
        <p className="text-[13.5px] font-medium leading-snug">
          {book.child_name} · {book.child_gender} · <span className="text-[#3f3f46]">{theme.label}</span>
        </p>
        <p className="text-xs font-medium leading-snug text-muted-foreground">
          Qualidade {book.quality === "high" ? "Alta" : "Média"} · {formatBookDate(book.created_at)}
        </p>
      </div>
    </Link>
  )
}
