import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { bkButton } from "@/components/books/books-ui"
import { LpBrand } from "@/components/books/lp/lp-ui"
import { BOOKS_WHATSAPP } from "@/modules/books/constants"

export const metadata: Metadata = {
  title: "Falaped Books — o livro que a sua criança vai pedir para ler de novo",
  description:
    "Livro infantil ilustrado de 20 páginas onde a sua criança é a protagonista, com o rosto e o nome dela em cada página. Uma história para cada fase da infância, em PDF, entregue na hora.",
  openGraph: { title: "Falaped Books", description: "Um livro ilustrado onde a sua criança é a protagonista.", type: "website" },
}

export default function BooksLandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="books-grid min-h-screen">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b-[3px] border-ink bg-white/90 px-4 backdrop-blur sm:h-20 sm:px-10">
        <LpBrand small />
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href="/books/lp#como-funciona" className="hidden text-[13px] font-bold underline decoration-secondary decoration-2 underline-offset-4 sm:inline">
            Como funciona
          </Link>
          <Link href="/books/lp#temas" className="hidden text-[13px] font-bold underline decoration-secondary decoration-2 underline-offset-4 sm:inline">
            Temas
          </Link>
          <Link href="/books/lp/criar" className={bkButton("warning", "h-10 px-4 text-[13px] sm:h-11 sm:px-5 sm:text-sm")}>
            Criar a história
            <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden />
          </Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="mt-16 border-t-[3px] border-ink bg-white">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-10">
          <div className="flex flex-col gap-3">
            <LpBrand small />
            <p className="max-w-xs text-[13px] font-medium text-[#3f3f46]">Livros infantis personalizados, feitos pela equipe do Falaped, o assistente de IA para pediatras.</p>
          </div>
          <ul className="flex flex-col gap-2 text-[13.5px] font-bold">
            <li>
              <Link href="/books/lp/privacidade" className="underline decoration-secondary decoration-2 underline-offset-4">
                Política de privacidade
              </Link>
            </li>
            <li>
              <a href={`https://wa.me/${BOOKS_WHATSAPP}`} target="_blank" rel="noreferrer" className="underline decoration-secondary decoration-2 underline-offset-4">
                Falar no WhatsApp
              </a>
            </li>
            <li>
              <a href="https://falaped.com.br" target="_blank" rel="noreferrer" className="underline decoration-secondary decoration-2 underline-offset-4">
                Falaped para pediatras
              </a>
            </li>
          </ul>
        </div>
        <p className="border-t-2 border-ink px-4 py-4 text-center text-xs font-medium text-muted-foreground sm:px-10">
          © Falaped · As fotos enviadas são usadas só para ilustrar o livro da sua criança e podem ser apagadas a qualquer momento pelo WhatsApp.
        </p>
      </footer>
    </div>
  )
}
