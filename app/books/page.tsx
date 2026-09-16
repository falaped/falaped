import { Suspense } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { BooksList } from "@/components/books/books-list"
import { BooksListSkeleton } from "@/components/books/books-list-skeleton"
import { bkButton } from "@/components/books/books-ui"

export default function BooksPage() {
  return (
    <>
      <div className="flex flex-col gap-4 px-4 pb-5 pt-6 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:px-10 sm:pb-8 sm:pt-11">
        <div>
          <h1 className="font-display text-[40px] font-extrabold leading-none tracking-[-.03em] sm:text-[64px]">
            <span className="bg-[linear-gradient(transparent_58%,#f5c4b8_58%)]">Livros</span>
          </h1>
          <p className="mt-2.5 text-sm font-medium leading-relaxed text-[#3f3f46] sm:mt-3.5 sm:text-base">
            Livros ilustrados personalizados para presentear seus pacientes.
          </p>
        </div>
        <Link href="/books/new" className={bkButton("primary", "h-[52px] w-full px-[22px] text-[15px] sm:h-[50px] sm:w-auto")}>
          <Plus className="size-4" strokeWidth={2.6} aria-hidden />
          Novo livro
        </Link>
      </div>
      <Suspense fallback={<BooksListSkeleton />}>
        <BooksList />
      </Suspense>
    </>
  )
}
