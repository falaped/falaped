"use client"

import { Skeleton } from "@/components/ui/skeleton"

type ListDeletingSkeletonOverlayProps = {
  /** Screen reader + polite live region message */
  label: string
  /** Short line shown above skeleton rows */
  visibleMessage?: string
  rows?: number
  variant: "medical-certificates" | "prescriptions"
}

/**
 * Full-area overlay with pulsing row placeholders while list mutations run (e.g. bulk delete).
 */
export function ListDeletingSkeletonOverlay({
  label,
  visibleMessage = "Excluindo…",
  rows = 6,
  variant,
}: ListDeletingSkeletonOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col justify-center bg-background/80 px-4 py-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <p
        className="mb-4 text-center text-sm text-muted-foreground"
        aria-hidden
      >
        {visibleMessage}
      </p>
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-3 border-b border-transparent py-1"
          >
            <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
            <Skeleton className="h-4 w-28 shrink-0" />
            {variant === "medical-certificates" ? (
              <Skeleton className="h-4 w-36 shrink-0" />
            ) : null}
            <Skeleton className="h-4 min-w-0 flex-1 max-w-[220px]" />
            <Skeleton className="ml-auto h-8 w-8 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
