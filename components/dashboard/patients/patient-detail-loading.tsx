import { Skeleton } from "@/components/ui/skeleton"

export function PatientDetailLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="w-full overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border bg-muted/20 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="order-1 flex w-full shrink-0 justify-end gap-2 sm:order-2 sm:w-auto">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-9" />
            </div>
            <div className="order-2 flex min-w-0 flex-1 flex-col gap-5 sm:order-1 sm:flex-row sm:items-start sm:gap-6">
              <Skeleton className="h-20 w-20 shrink-0 rounded-full sm:h-24 sm:w-24" />
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-9 w-64 max-w-full" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-40 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-36 rounded-full" />
                  <Skeleton className="h-8 w-48 max-w-full rounded-full" />
                  <Skeleton className="h-8 w-44 max-w-full rounded-full" />
                </div>
                <Skeleton className="h-4 w-full max-w-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <div className="space-y-4 pl-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
