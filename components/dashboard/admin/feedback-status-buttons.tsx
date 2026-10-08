"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { updateFeedbackStatusAction } from "@/actions"
import { FEEDBACK_STATUSES, FEEDBACK_STATUS_LABEL, type FeedbackStatus } from "@/lib/feedback"
import { cn } from "@/lib/utils"

/** Novo · Em análise · Feito na linha do feedback; muda na hora e salva em seguida. */
export function FeedbackStatusButtons({ id, status }: { id: string; status: FeedbackStatus }) {
  const [current, setCurrent] = useState(status)
  const [pending, startTransition] = useTransition()

  function change(next: FeedbackStatus) {
    const previous = current
    setCurrent(next)
    startTransition(async () => {
      const result = await updateFeedbackStatusAction(id, next)
      if (!result.ok) {
        setCurrent(previous)
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex items-start gap-1" role="radiogroup" aria-label="Status">
      {FEEDBACK_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={current === s}
          disabled={pending}
          onClick={() => current !== s && change(s)}
          className={cn(
            "h-7 rounded-full border px-2.5 text-caption transition-colors",
            current === s ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:bg-accent",
          )}
        >
          {FEEDBACK_STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  )
}
