import { Skeleton } from "@/components/ui/skeleton"

/** Suspense fallback da Ficha: cabeçalho com abas e as faixas do Resumo. */
export function PatientDetailLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando ficha">
      <div className="-mx-8 -mt-8 border-b border-border bg-card">
        <div className="max-w-[1440px] px-8 pt-6">
          <Skeleton className="mb-2 h-8 w-20 rounded-md" />
          <div className="flex items-start gap-4">
            <Skeleton className="size-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-64 rounded-md" />
              <Skeleton className="h-4 w-96 rounded-md" />
            </div>
            <Skeleton className="h-9 w-72 rounded-lg" />
          </div>
          <div className="mt-5 flex gap-5 pb-2.5">
            {[64, 48, 88, 96, 64, 64, 96, 56, 64].map((width, index) => (
              <Skeleton key={index} className="h-5 rounded-md" style={{ width }} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex max-w-[1440px] flex-col gap-6 pt-8">
        <div className="grid grid-cols-5 divide-x divide-border rounded-xl border border-border bg-card">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2 px-5 py-4">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-6 w-24 rounded-md" />
            </div>
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
