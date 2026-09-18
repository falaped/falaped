import Link from "next/link"
import { redirect } from "next/navigation"
import { BookOpen, Plus } from "lucide-react"

import { BookCard } from "@/components/books/book-card"
import { BrandBlur, bkButton } from "@/components/books/books-ui"
import { env } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { listBooks } from "@/modules/books/list-books"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export async function BooksList() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const books = await listBooks(createAdminClient(), profile.id)
  const isAdmin = !!profile.email && env.BOOKS_ADMIN_EMAILS.includes(profile.email.toLowerCase())
  const ordersLink = isAdmin && (
    <div className="mx-auto mb-5 max-w-[1400px] px-4 sm:px-10">
      <Link href="/books/leads" className="inline-flex items-center gap-1.5 text-[13px] font-bold underline decoration-warning decoration-2 underline-offset-4">
        Pedidos da landing (books.falaped.com.br)
      </Link>
    </div>
  )

  if (!books.length)
    return (
      <>
      {ordersLink}
      <div className="mx-4 mb-8 flex max-w-[1400px] flex-col xl:mx-auto items-center gap-4 rounded-[20px] border-2 border-dashed border-ink bg-white px-6 py-12 text-center sm:mx-10 sm:mb-14 sm:px-10 sm:py-14">
        <div className="relative grid h-[200px] w-[150px] -rotate-4 place-items-center overflow-hidden rounded-[14px] border-2 border-ink bg-accent shadow-hard-md">
          <BrandBlur className="scale-100 blur-xl" />
          <BookOpen className="relative size-11" strokeWidth={1.8} aria-hidden />
        </div>
        <h2 className="mt-3 font-display text-[34px] font-extrabold leading-[1.05] tracking-tight">Nenhum livro ainda</h2>
        <p className="max-w-[440px] text-[15px] font-medium leading-relaxed text-[#3f3f46] text-pretty">
          Crie o primeiro. Você aprova a capa antes de gerar as outras páginas.
        </p>
        <Link href="/books/new" className={bkButton("primary", "h-[50px] px-[22px] text-[15px]")}>
          <Plus className="size-4" strokeWidth={2.6} aria-hidden />
          Novo livro
        </Link>
      </div>
      </>
    )

  return (
    <>
    {ordersLink}
    <div className="mx-auto grid max-w-[1400px] gap-5 px-4 pb-8 sm:grid-cols-2 sm:gap-7 sm:px-10 sm:pb-14 lg:grid-cols-3">
      {books.map((b) => (
        <BookCard key={b.id} book={b} />
      ))}
    </div>
    </>
  )
}
