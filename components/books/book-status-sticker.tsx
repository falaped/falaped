import { Sticker } from "@/components/books/books-ui"
import type { BookStatus } from "@/modules/books/constants"
import { cn } from "@/lib/utils"

export const BOOK_STATUS_LABEL: Record<BookStatus, string> = {
  draft: "Rascunho",
  cover_ready: "Capa pronta",
  generating: "Gerando",
  ready: "Pronto",
  failed: "Com falhas",
}

const BG: Record<BookStatus, string> = {
  draft: "bg-[#ededeb]",
  cover_ready: "bg-primary",
  generating: "bg-warning",
  ready: "bg-success",
  failed: "bg-destructive",
}

export function BookStatusSticker({ status, className }: { status: BookStatus; className?: string }) {
  return <Sticker className={cn(BG[status], className)}>{BOOK_STATUS_LABEL[status]}</Sticker>
}
