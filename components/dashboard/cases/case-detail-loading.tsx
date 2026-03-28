import { Skeleton } from "@/components/ui/skeleton"

import { caseDetailMainStackClassName } from "@/components/dashboard/cases/case-detail-workspace"

export function CaseDetailLoading() {
  return (
    <div className={caseDetailMainStackClassName}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-4 w-full max-w-lg" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      </div>

      <Skeleton className="h-px w-full" />

      <Skeleton className="h-[88px] rounded-xl" />

      <Skeleton className="h-10 w-full max-w-xs rounded-md" />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-1 rounded-lg bg-muted p-1 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-[min(420px,55vh)] rounded-xl" />
      </div>
    </div>
  )
}
