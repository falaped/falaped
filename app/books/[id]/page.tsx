import { Suspense } from "react"

import { BookDetail } from "@/components/books/book-detail"
import { Skeleton } from "@/components/ui/skeleton"

// Teto do plano Hobby. Cada action de geração cabe em uma onda (~100–130 s em high);
// as 19 páginas são geradas em várias chamadas encadeadas pelo cliente (ver BookActions).
export const maxDuration = 300

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <BookDetail params={params} />
    </Suspense>
  )
}
