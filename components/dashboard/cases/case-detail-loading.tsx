import { Skeleton } from "@/components/ui/skeleton"

export function CaseDetailLoading() {
  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-start gap-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="ml-auto h-9 w-40 rounded-md" />
        </div>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-96 rounded-xl" />
        <div className="flex flex-col gap-5">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
