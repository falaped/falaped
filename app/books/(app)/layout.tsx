import { BooksHeader } from "@/components/books/books-header"

export default function BooksAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BooksHeader />
      <main>{children}</main>
    </>
  )
}
