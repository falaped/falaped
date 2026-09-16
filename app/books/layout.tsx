import Link from "next/link"
import { BookOpenIcon } from "lucide-react"

export default function BooksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-t-8 border-t-primary">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/books" className="flex items-center gap-2 font-semibold">
            <BookOpenIcon className="size-5 text-primary" aria-hidden />
            Falaped Books
          </Link>
          <a href="https://app.falaped.com.br/dashboard" className="text-sm text-muted-foreground hover:underline">
            Voltar ao Falaped
          </a>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">{children}</main>
    </div>
  )
}
