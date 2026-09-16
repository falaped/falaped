import { Suspense } from "react"

import { BookDetail } from "@/components/books/book-detail"

// Teto do plano Hobby. Cada action de geração cabe em uma onda (~100–130 s em high);
// as 19 páginas são geradas em várias chamadas encadeadas pelo cliente (ver BookActions).
export const maxDuration = 300

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="bk-card h-96 animate-pulse bg-muted" />}>
      <BookDetail params={params} />
    </Suspense>
  )
}
