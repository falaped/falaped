import { Badge } from "@/components/ui/badge"
import type { BookStatus } from "@/modules/books/constants"

const LABELS: Record<BookStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "outline" },
  cover_ready: { label: "Capa pronta", variant: "secondary" },
  generating: { label: "Gerando", variant: "secondary" },
  ready: { label: "Pronto", variant: "default" },
  failed: { label: "Com falhas", variant: "destructive" },
}

export function BookStatusBadge({ status }: { status: BookStatus }) {
  const { label, variant } = LABELS[status]
  return <Badge variant={variant}>{label}</Badge>
}
