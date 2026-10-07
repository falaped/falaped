import { Skeleton } from "@/components/ui/skeleton"

/**
 * Suspense fallback for the dashboard home screen: same blocks as the Início
 * (title, the two panels and the numbers), so nothing jumps when it loads.
 */
export function DashboardHomeLoading() {
  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-6" aria-busy="true" aria-label="Carregando início">
      <div>
        <Skeleton className="h-8 w-56 rounded-md" />
        <Skeleton className="mt-2 h-4 w-48 rounded-md" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, panel) => (
          <div key={panel} className="rounded-xl border border-border bg-card">
            <Skeleton className="mx-5 mt-4 mb-3 h-6 w-48 rounded-md" />
            <div className="divide-y divide-border border-t border-border">
              {Array.from({ length: 3 }).map((_, row) => (
                <div key={row} className="flex min-h-16 items-center gap-3 px-5 py-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40 rounded-md" />
                    <Skeleton className="h-3 w-56 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 divide-x divide-border rounded-xl border border-border bg-card">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2 px-6 py-5">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
