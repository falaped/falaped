import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

/** Espelha as duas faixas de S1: três cards bare na Faixa A, um Card emoldurado na Faixa B. */
export default function EarningsLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-1 h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-40 shrink-0" />
      </div>

      <Separator />

      <div className="flex flex-col gap-6">
        <section>
          <Skeleton className="h-4 w-16" />
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-36" />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </CardContent>
          <div className="px-4 py-4 border-b border-border">
            <Skeleton className="h-[240px] w-full" />
          </div>
          <div className="space-y-3 px-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
