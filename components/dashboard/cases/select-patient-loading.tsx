import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * Skeleton for select-patient data (Suspense / route loading). Header lives in layout.tsx.
 */
export function SelectPatientLoading() {
  return (
    <div
      className="flex flex-col gap-3"
      aria-busy="true"
      aria-label="Carregando lista de pacientes"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Skeleton className="h-8 w-full max-w-xl rounded-lg" />
      </div>

      <Card className="overflow-hidden border-border/70 p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[140px]">Paciente</TableHead>
                <TableHead className="min-w-[160px]">Responsável</TableHead>
                <TableHead className="min-w-[120px] whitespace-nowrap">Nascimento</TableHead>
                <TableHead className="min-w-[140px]">Situação</TableHead>
                <TableHead className="w-48 min-w-48 text-right">Workspace</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, index) => (
                <TableRow
                  key={index}
                  className="border-border/60 hover:bg-transparent"
                >
                  <TableCell className="py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Skeleton className="size-6 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-36 max-w-full rounded-md" />
                        <Skeleton className="h-3 w-28 max-w-full rounded-md" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Skeleton className="h-4 w-32 max-w-full rounded-md" />
                  </TableCell>
                  <TableCell className="py-4">
                    <Skeleton className="h-4 w-28 rounded-md" />
                  </TableCell>
                  <TableCell className="py-4">
                    <Skeleton className="h-6 w-28 rounded-full" />
                  </TableCell>
                  <TableCell className="w-48 min-w-48 py-4 text-right">
                    <Skeleton className="ml-auto h-7 w-full max-w-48 rounded-md" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
