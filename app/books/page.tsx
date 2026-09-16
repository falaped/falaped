import { Suspense } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { BooksList } from "@/components/books/books-list"

export default function BooksPage() {
  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="inline-block border-b-4 border-primary text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            Livros
          </h1>
          <p className="bk-hand mt-3 text-2xl text-foreground/80">
            Livros ilustrados personalizados, gerados por IA, para você presentear seus pacientes.
          </p>
        </div>
        <Link href="/books/new" className="bk-btn bk-btn-primary bk-btn-lg w-full shrink-0 sm:w-auto">
          <Plus className="size-5" aria-hidden />
          Novo livro
        </Link>
      </div>
      <Suspense fallback={<div className="bk-card h-40 animate-pulse bg-muted" />}>
        <BooksList />
      </Suspense>
    </>
  )
}
