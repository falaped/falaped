"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, MessageCircle } from "lucide-react"

import { bkButton } from "@/components/books/books-ui"

const CTA = "h-10 px-4 text-[13px] sm:h-11 sm:px-5 sm:text-sm"

/**
 * CTA do header: na landing leva para o wizard; dentro do wizard vira
 * "Concluir compra" e desce até a oferta, que é o que falta fazer ali.
 * O host books.* serve o wizard em /criar, por isso os dois caminhos.
 */
export function LpHeaderCta() {
  const pathname = usePathname()
  const onWizard = pathname === "/criar" || pathname.startsWith("/books/lp/criar")

  if (onWizard)
    return (
      <a href="#pedido" className={bkButton("warning", CTA)}>
        <MessageCircle className="size-4" strokeWidth={2.6} aria-hidden />
        Concluir compra
      </a>
    )
  return (
    <Link href="/books/lp/criar" className={bkButton("warning", CTA)}>
      Criar a história
      <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden />
    </Link>
  )
}
