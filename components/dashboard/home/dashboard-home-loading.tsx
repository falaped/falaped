import { Skeleton } from "@/components/ui/skeleton"

/**
 * Suspense fallback for the dashboard home screen: same blocks as the Início
 * (saudação, Hoje e Para não esquecer, financeiro e últimas consultas), so nothing jumps when it loads.
 */
export function DashboardHomeLoading() {
  const rows = (count: number) =>
    Array.from({ length: count }).map((_, row) => (
      <div key={row} className="flex items-center gap-3 px-5 py-3">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-48 rounded-md" />
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>
      </div>
    ))

  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-6" aria-busy="true" aria-label="Carregando início">
      <div className="rounded-xl border border-border bg-card px-8 py-7">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="mt-2 h-5 w-96 rounded-md" />
      </div>
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="rounded-xl border border-border bg-card xl:col-span-4">
          <Skeleton className="mx-5 mt-4 mb-3 h-6 w-20 rounded-md" />
          <div className="divide-y divide-border border-t border-border">{rows(3)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card xl:col-span-8">
          <Skeleton className="mx-5 mt-4 mb-3 h-6 w-72 rounded-md" />
          <div className="divide-y divide-border border-t border-border">{rows(3)}</div>
        </div>
      </div>
      <div className="grid grid-cols-4 divide-x divide-border rounded-xl border border-border bg-card">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2 px-6 py-5">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card">
        <Skeleton className="mx-5 mt-4 mb-3 h-6 w-48 rounded-md" />
        <div className="divide-y divide-border border-t border-border">{rows(3)}</div>
      </div>
    </div>
  )
}
