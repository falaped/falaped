import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function LinkWhatsAppLoading() {
  return (
    <div className="max-w-4xl w-full">
      <Card className="w-full max-w-md">
        <CardHeader className="text-pretty text-sm text-muted-foreground w-full max-w-md">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="mt-1 h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
