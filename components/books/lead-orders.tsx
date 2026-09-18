import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, MessageCircle } from "lucide-react"

import { claimLeadBookAction } from "@/actions/books"
import { requireBooksAdmin } from "@/actions/books/require-books-admin"
import { BrandBlur, Chip, bkButton } from "@/components/books/books-ui"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { bookPriceWithCoupon } from "@/modules/books/constants"
import { listLeadBooks } from "@/modules/books/list-lead-books"
import { BOOK_THEMES } from "@/modules/books/themes"

const STATUS: Record<string, { label: string; className: string }> = {
  new: { label: "Sem capa", className: "bg-white" },
  cover_ready: { label: "Capa pronta", className: "bg-accent" },
  checkout: { label: "Pediu o livro", className: "bg-warning" },
  paid: { label: "Pago", className: "bg-success" },
}

function formatWhatsapp(d: string) {
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
}

export async function LeadOrders() {
  const admin = await requireBooksAdmin()
  if (!admin.ok) redirect("/books")
  const orders = await listLeadBooks(createAdminClient())

  if (!orders.length)
    return <p className="mx-4 rounded-[20px] border-2 border-dashed border-ink bg-white px-6 py-12 text-center font-medium sm:mx-10">Nenhum pedido ainda.</p>

  return (
    <ul className="mx-auto grid max-w-[1400px] gap-4 px-4 pb-10 sm:px-10 sm:pb-14">
      {orders.map(({ book, lead, coverUrl }) => {
        const st = STATUS[lead.status] ?? STATUS.new
        const claimed = !!book.profile_id
        const wa = `https://wa.me/55${lead.whatsapp}?text=${encodeURIComponent(`Olá, ${lead.first_name}! Aqui é do Falaped Books, sobre o livro de ${book.child_name}.`)}`
        return (
          <li key={book.id} className="flex flex-col gap-4 rounded-[18px] border-2 border-ink bg-white p-4 shadow-hard-xs sm:flex-row sm:items-center">
            <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-[10px] border-2 border-ink bg-muted">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt={`Capa de ${book.child_name}`} className="size-full object-cover" />
              ) : (
                <BrandBlur />
              )}
            </div>
            <dl className="grid flex-1 gap-x-4 gap-y-1 text-[13.5px] font-medium sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">Criança</dt>
              <dd className="font-bold">
                {book.child_name} · {book.child_gender} · {BOOK_THEMES[book.theme]?.label ?? book.theme}
              </dd>
              <dt className="text-muted-foreground">Responsável</dt>
              <dd className="font-bold">
                {lead.first_name} {lead.last_name} · {lead.email}
              </dd>
              <dt className="text-muted-foreground">WhatsApp</dt>
              <dd>
                <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold underline decoration-secondary decoration-2 underline-offset-2">
                  <MessageCircle className="size-3.5" aria-hidden />
                  {formatWhatsapp(lead.whatsapp)}
                </a>
              </dd>
              <dt className="text-muted-foreground">Valor</dt>
              <dd className="font-bold">
                R$ {bookPriceWithCoupon(lead.coupon)}
                {lead.coupon && ` · cupom ${lead.coupon}`}
              </dd>
              <dt className="text-muted-foreground">Criado</dt>
              <dd className="font-bold">{new Date(book.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</dd>
            </dl>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <Chip className={st.className}>{st.label}</Chip>
              {claimed ? (
                <Link href={`/books/${book.id}`} className={bkButton("secondary", "h-11 text-[13px]")}>
                  Abrir livro
                  <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden />
                </Link>
              ) : (
                <form action={claimLeadBookAction}>
                  <input type="hidden" name="bookId" value={book.id} />
                  <button type="submit" className={bkButton("primary", "h-11 w-full text-[13px]")}>
                    Pix confirmado: assumir livro
                    <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden />
                  </button>
                </form>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
