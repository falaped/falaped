import { Bricolage_Grotesque, Inter } from "next/font/google"

// Fontes do handoff: Inter no corpo, Bricolage Grotesque em títulos e adesivos.
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-books", display: "swap" })
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-books-display",
  display: "swap",
})

/** Tema visual do Books. O cabeçalho fica nos grupos: (app) logado e lp pública. */
export default function BooksLayout({ children }: { children: React.ReactNode }) {
  return <div className={`books-theme min-h-screen ${inter.variable} ${bricolage.variable}`}>{children}</div>
}
