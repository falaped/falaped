import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { Sticker } from "@/components/books/books-ui"

export function BooksHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b-2 border-ink bg-white px-4 sm:h-[68px] sm:px-10">
      <Link href="/books" className="flex items-center gap-2 text-ink no-underline sm:gap-3">
        <span className="text-[17px] font-extrabold leading-none tracking-tight sm:text-[22px]">FalaPed</span>
        <Sticker className="-rotate-4 bg-warning px-2 py-1.5 text-[10px] sm:text-xs">Books</Sticker>
      </Link>
      <a
        href="https://app.falaped.com.br/dashboard"
        className="hidden items-center gap-1.5 text-[13px] font-bold text-ink underline decoration-secondary decoration-2 underline-offset-4 sm:inline-flex"
      >
        Ir para o Falaped
        <ArrowUpRight className="size-3.5" aria-hidden />
      </a>
      <a
        href="https://app.falaped.com.br/dashboard"
        aria-label="Ir para o Falaped"
        className="grid size-9 place-items-center rounded-full border-2 border-ink bg-white text-ink sm:hidden"
      >
        <ArrowUpRight className="size-4" aria-hidden />
      </a>
    </header>
  )
}
