import { Suspense } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { BooksList } from "@/components/books/books-list"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

export default function BooksPage() {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Livros</h1>
          <p className="mt-1 text-sm text-muted-foreground">Livros ilustrados personalizados gerados por IA.</p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href="/books/new">
            <Plus className="mr-2 size-4" aria-hidden />
            Novo livro
          </Link>
        </Button>
      </div>
      <Separator />
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <BooksList />
      </Suspense>
    </>
  )
}
