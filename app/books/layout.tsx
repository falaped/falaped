import { Bricolage_Grotesque, Inter } from "next/font/google"

import { BooksHeader } from "@/components/books/books-header"

// Fontes do handoff: Inter no corpo, Bricolage Grotesque em títulos e adesivos.
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-books", display: "swap" })
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-books-display",
  display: "swap",
})

export default function BooksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`books-theme min-h-screen ${inter.variable} ${bricolage.variable}`}>
      <BooksHeader />
      <main>{children}</main>
    </div>
  )
}
