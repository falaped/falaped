import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Suspense fallback for the dashboard home screen.
 */
export function DashboardHomeLoading() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando início"
    >
      <div>
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl rounded-md" />
      </div>

      <Card className="border-primary/20 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-4 w-full max-w-md rounded-md" />
          </div>
          <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-5 w-full rounded-md" />
            </div>
          ))}
        </div>
      </Card>

      <div>
        <Skeleton className="h-4 w-40 rounded-md" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-3 w-28 rounded-md" />
              <Skeleton className="mt-2 h-8 w-14 rounded-md" />
            </Card>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border p-4">
          <Skeleton className="h-5 w-56 rounded-md" />
          <Skeleton className="mt-2 h-4 w-72 rounded-md" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </Card>
    </div>
  )
}
