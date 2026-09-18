import { Suspense } from "react"

import { LeadOrders } from "@/components/books/lead-orders"

export default function LeadOrdersPage() {
  return (
    <>
      <div className="mx-auto max-w-[1400px] px-4 pb-5 pt-6 sm:px-10 sm:pb-8 sm:pt-11">
        <h1 className="font-display text-[40px] font-extrabold leading-none tracking-[-.03em] sm:text-[64px]">
          <span className="bg-[linear-gradient(transparent_58%,#f5c21a_58%)]">Pedidos</span>
        </h1>
        <p className="mt-2.5 text-sm font-medium leading-relaxed text-[#3f3f46] sm:mt-3.5 sm:text-base">
          Capas criadas em books.falaped.com.br. Confirmou o Pix no WhatsApp? Assuma o livro para gerar as páginas e o PDF.
        </p>
      </div>
      <Suspense fallback={<div className="mx-4 h-64 animate-pulse rounded-[20px] border-2 border-ink bg-white sm:mx-10" />}>
        <LeadOrders />
      </Suspense>
    </>
  )
}
