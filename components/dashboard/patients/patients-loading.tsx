import { Skeleton } from "@/components/ui/skeleton"

/** Suspense fallback das listas (Pacientes, Documentos): os mesmos blocos da tela, para nada pular ao carregar. */
export function PatientsLoading({ label = "Carregando pacientes" }: { label?: string }) {
  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-6" aria-busy="true" aria-label={label}>
      <div className="rounded-xl border border-border bg-card px-8 py-7">
        <Skeleton className="h-9 w-48 rounded-md" />
        <Skeleton className="mt-2 h-5 w-64 rounded-md" />
      </div>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-5 px-5 pt-4 pb-2.5">
          {[176, 40, 168].map((width) => (
            <Skeleton key={width} className="h-5 rounded-md" style={{ width }} />
          ))}
          <Skeleton className="ml-auto h-9 w-80 rounded-lg" />
        </div>
        <div className="divide-y divide-border border-t border-border">
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
