import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ReportTemplatesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-8 w-56" />
        </div>
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="h-px bg-border" />
      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-3 p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
