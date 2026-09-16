import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export function BooksHeader() {
  return (
    <header className="relative z-10 border-b-4 border-foreground bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/books" className="flex items-center gap-3">
          <span className="text-2xl font-black uppercase tracking-tighter">FalaPed</span>
          <span className="bk-sticker bg-secondary">Books</span>
        </Link>
        <a href="https://app.falaped.com.br/dashboard" className="bk-btn bk-btn-sm">
          Ir para o Falaped
          <ArrowUpRight className="size-4" aria-hidden />
        </a>
      </div>
    </header>
  )
}
