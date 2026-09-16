import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { BookActions } from "@/components/books/book-actions"
import { BookStatusSticker } from "@/components/books/book-status-sticker"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { getBook } from "@/modules/books/get-book"
import { renderBookText } from "@/modules/books/render-book-text"
import { getBookTheme } from "@/modules/books/themes"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export async function BookDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = await params
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const book = await getBook(createAdminClient(), profile.id, bookId)
  if (!book) notFound()

  const theme = getBookTheme(book.theme)
  const title = renderBookText(theme.title, { name: book.child_name, gender: book.child_gender })
  const meta = [
    theme.label,
    `${book.child_name} (${book.child_gender})`,
    `Qualidade ${book.quality === "high" ? "Alta" : "Média"}`,
    book.pediatrician_name,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <>
      <div className="border-b-2 border-ink bg-white">
      <div className="mx-auto max-w-[1400px] px-4 py-[18px] sm:px-10 sm:pb-6 sm:pt-7">
        <Link
          href="/books"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink underline decoration-secondary decoration-2 underline-offset-4"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2.2} aria-hidden />
          Todos os livros
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3 sm:mt-3.5 sm:gap-[18px]">
          <h1 className="font-display text-[30px] font-extrabold leading-[1.05] tracking-tight sm:text-[48px] sm:leading-none sm:tracking-[-.03em]">
            {title}
          </h1>
          <BookStatusSticker status={book.status} />
        </div>
        <p className="mt-2.5 text-[12.5px] font-medium leading-relaxed text-[#3f3f46] sm:mt-3 sm:text-sm">{meta}</p>
      </div>
      </div>
      <BookActions book={book} title={title} />
    </>
  )
}
