import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function SectionSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-5 w-44" />
        </div>
        <Skeleton className="mt-1 h-4 w-full max-w-xl" />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function FieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-9 w-full" />
    </div>
  )
}

/** Espelha o layout de `ProfileContent`: identidade, dados, marca, relatório e valores. */
export function ProfileLoading() {
  return (
    <div className="flex w-full max-w-4xl flex-col gap-6" aria-busy aria-label="Carregando perfil">
      <Card className="gap-0 overflow-hidden py-0">
        <div className="h-16 bg-muted/40" />
        <CardContent className="-mt-8 flex items-end gap-4 pb-6">
          <Skeleton className="size-20 rounded-2xl border-4 border-card" />
          <div className="space-y-2 pb-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </CardContent>
      </Card>

      <SectionSkeleton>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <FieldSkeleton key={i} />
          ))}
        </div>
      </SectionSkeleton>

      <SectionSkeleton>
        <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
          <Skeleton className="aspect-[3/1] w-full rounded-xl" />
          <Skeleton className="aspect-square w-full max-w-40 rounded-xl" />
        </div>
        <Skeleton className="mt-6 h-36 w-full rounded-xl" />
      </SectionSkeleton>

      <SectionSkeleton>
        <div className="max-w-md">
          <FieldSkeleton />
        </div>
      </SectionSkeleton>

      <SectionSkeleton>
        <div className="max-w-xs">
          <FieldSkeleton />
        </div>
        <Skeleton className="mt-6 h-28 w-full rounded-lg" />
      </SectionSkeleton>
    </div>
  )
}
