import type { BookStatus } from "@/modules/books/constants"

const LABELS: Record<BookStatus, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted" },
  cover_ready: { label: "Capa pronta", className: "bg-accent" },
  generating: { label: "Gerando", className: "bg-[var(--bk-mustard)]" },
  ready: { label: "Pronto", className: "bg-primary" },
  failed: { label: "Com falhas", className: "bg-destructive text-white" },
}

export function BookStatusBadge({ status }: { status: BookStatus }) {
  const { label, className } = LABELS[status]
  return <span className={`bk-sticker ${className}`}>{label}</span>
}
