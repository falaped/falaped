import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { BookActions } from "@/components/books/book-actions"
import { BookStatusBadge } from "@/components/books/book-status-badge"
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

  return (
    <>
      <div>
        <Link href="/books" className="mb-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:underline">
          <ArrowLeft className="size-4" aria-hidden />
          Todos os livros
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            <span className="border-b-4 border-primary">{title}</span>
          </h1>
          <BookStatusBadge status={book.status} />
        </div>
        <p className="mt-3 text-xs font-black uppercase tracking-widest text-foreground/60">
          {theme.label} · {book.child_name} ({book.child_gender}) · qualidade {book.quality === "high" ? "alta" : "média"}
          {book.pediatrician_name ? ` · ${book.pediatrician_name}` : ""}
        </p>
      </div>
      <BookActions book={book} />
    </>
  )
}
