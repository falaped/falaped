import { Caveat, Inter } from "next/font/google"

import { BooksHeader } from "@/components/books/books-header"

// Mesmas fontes da landing (falaped-lp): Inter para tudo, Caveat para o toque manuscrito.
const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700", "900"], variable: "--font-books", display: "swap" })
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-books-hand", display: "swap" })

export default function BooksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`books-theme relative min-h-screen overflow-hidden ${inter.variable} ${caveat.variable}`}>
      <div className="pointer-events-none absolute -right-16 top-40 size-56 rotate-12 bg-accent" aria-hidden />
      <div className="pointer-events-none absolute -left-12 bottom-24 size-40 -rotate-6 bg-secondary opacity-60" aria-hidden />
      <BooksHeader />
      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">{children}</main>
    </div>
  )
}
