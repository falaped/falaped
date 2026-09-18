import { NewBookWizard } from "@/components/books/new-book-wizard"
import { BOOK_THEMES } from "@/modules/books/themes"

export default function NewBookPage() {
  const themes = Object.values(BOOK_THEMES).map((t) => ({ slug: t.slug, label: t.label, hint: t.subtitle, title: t.title }))
  return <NewBookWizard themes={themes} />
}
