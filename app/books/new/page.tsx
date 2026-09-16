import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { BookForm } from "@/components/books/book-form"
import { BOOK_THEMES } from "@/modules/books/themes"

export default function NewBookPage() {
  const themes = Object.values(BOOK_THEMES).map((t) => ({ slug: t.slug, label: t.label }))
  return (
    <>
      <div>
        <Link href="/books" className="mb-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:underline">
          <ArrowLeft className="size-4" aria-hidden />
          Todos os livros
        </Link>
        <h1 className="block text-4xl font-black uppercase tracking-tighter sm:text-5xl">
          <span className="border-b-4 border-secondary">Novo livro</span>
        </h1>
        <p className="bk-hand mt-3 text-2xl text-foreground/80">
          Primeiro geramos a capa para você aprovar. Depois, as outras 19 páginas.
        </p>
      </div>
      <BookForm themes={themes} />
    </>
  )
}
