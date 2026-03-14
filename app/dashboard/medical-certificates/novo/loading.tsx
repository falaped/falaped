import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function NewMedicalCertificateLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-8 w-40" />
        </div>
      </div>
      <div className="h-px bg-border" />
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <Skeleton className="h-10 w-full max-w-xs" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-9 w-36 self-end rounded-lg" />
        </CardContent>
      </Card>
    </div>
  )
}
