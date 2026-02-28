import { Skeleton } from "@/components/ui/skeleton"

export function CaseDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-px w-full" />
      </div>

      <Skeleton className="h-16 rounded-xl" />

      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-md" />
        ))}
      </div>

      <Skeleton className="h-[480px] rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
