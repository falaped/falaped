import { Skeleton } from "@/components/ui/skeleton"

export function PatientsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Skeleton className="h-9 min-w-[200px] max-w-xs rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
