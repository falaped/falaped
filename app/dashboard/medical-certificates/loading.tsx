import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function MedicalCertificatesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-5 w-5 shrink-0 rounded" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-9 w-36 shrink-0 rounded-lg" />
      </div>
      <div className="h-px bg-border" />
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="mt-2 h-4 w-48" />
          <Skeleton className="mt-1 h-4 w-64" />
          <Skeleton className="mt-4 h-9 w-36 rounded-lg" />
        </CardContent>
      </Card>
    </div>
  )
}
