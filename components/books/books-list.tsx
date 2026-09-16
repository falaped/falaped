import Link from "next/link"
import { redirect } from "next/navigation"
import { BookOpen } from "lucide-react"

import { BookStatusBadge } from "@/components/books/book-status-badge"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { listBooks } from "@/modules/books/list-books"
import { renderBookText } from "@/modules/books/render-book-text"
import { getBookTheme } from "@/modules/books/themes"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export async function BooksList() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const books = await listBooks(createAdminClient(), profile.id)
  if (!books.length)
    return (
      <div className="bk-card flex flex-col items-center gap-4 bg-accent p-10 text-center sm:p-16">
        <BookOpen className="size-12" aria-hidden />
        <p className="text-2xl font-black uppercase tracking-tight">Nenhum livro ainda</p>
        <p className="max-w-md font-bold text-foreground/70">
          Crie o primeiro em Novo livro. Você aprova a capa antes de gerar as outras páginas.
        </p>
      </div>
    )

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {books.map((b) => {
        const theme = getBookTheme(b.theme)
        const title = renderBookText(theme.title, { name: b.child_name, gender: b.child_gender })
        return (
          <Link key={b.id} href={`/books/${b.id}`} className="bk-card bk-card-interactive flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-widest text-foreground/60">{theme.label}</span>
              <BookStatusBadge status={b.status} />
            </div>
            <div>
              <p className="text-2xl font-black uppercase leading-tight tracking-tighter">{title}</p>
              <p className="mt-1 font-bold text-foreground/70">
                {b.child_name} · {b.child_gender}
              </p>
            </div>
            <div className="mt-auto flex items-center justify-between border-t-3 border-foreground pt-3 text-xs font-black uppercase tracking-wider">
              <span>Qualidade {b.quality === "high" ? "alta" : "média"}</span>
              <span>{new Date(b.created_at).toLocaleDateString("pt-BR")}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
