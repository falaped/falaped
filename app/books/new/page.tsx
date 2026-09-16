import { BookForm } from "@/components/books/book-form"
import { Separator } from "@/components/ui/separator"
import { BOOK_THEMES } from "@/modules/books/themes"

export default function NewBookPage() {
  const themes = Object.values(BOOK_THEMES).map((t) => ({ slug: t.slug, label: t.label }))
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo livro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Primeiro geramos a capa para você aprovar. Depois, as outras 19 páginas.
        </p>
      </div>
      <Separator />
      <BookForm themes={themes} />
    </>
  )
}
