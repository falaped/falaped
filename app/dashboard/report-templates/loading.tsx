import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ReportTemplatesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-5 w-5 shrink-0 rounded" />
            <Skeleton className="h-8 w-56" />
          </div>
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-9 w-36 shrink-0 rounded-lg" />
      </div>
      <div className="h-px bg-border" />
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Skeleton className="h-9 min-w-[200px] max-w-xs rounded-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 pt-5">
              <div className="-mt-7 mb-3 flex gap-1.5">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-32 flex-1" />
              </div>
              <Skeleton className="mt-1 h-4 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
