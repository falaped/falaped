import { notFound, redirect } from "next/navigation"

import { BookActions } from "@/components/books/book-actions"
import { BookStatusBadge } from "@/components/books/book-status-badge"
import { Separator } from "@/components/ui/separator"
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <BookStatusBadge status={book.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {theme.label} · {book.child_name} ({book.child_gender}) · qualidade {book.quality}
            {book.pediatrician_name ? ` · ${book.pediatrician_name}` : ""}
          </p>
        </div>
      </div>
      <Separator />
      <BookActions book={book} />
    </>
  )
}
