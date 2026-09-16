import { Suspense } from "react"

import { BookDetail } from "@/components/books/book-detail"
import { Skeleton } from "@/components/ui/skeleton"

// Gerar as 19 páginas em ondas leva vários minutos (gpt-image-2 high ≈ 100 s/imagem).
// ponytail: síncrono no request; mover para fila/after() se estourar o plano da Vercel.
export const maxDuration = 800

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <BookDetail params={params} />
    </Suspense>
  )
}
