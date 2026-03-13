import { MessageCircleIcon } from "lucide-react"

export function DiscussionEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <MessageCircleIcon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mt-4 font-medium text-muted-foreground">Nenhuma discussão.</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground/80">
        As conversas livres com o Falaped aparecerão aqui.
      </p>
    </div>
  )
}
