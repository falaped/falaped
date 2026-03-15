import { Card, CardContent } from "@/components/ui/card"

export default function PrescriptionTemplatesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-16 w-64 animate-pulse rounded-md bg-muted" />
      <div className="h-10 w-full max-w-xs animate-pulse rounded-md bg-muted" />
      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 pt-5">
              <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
