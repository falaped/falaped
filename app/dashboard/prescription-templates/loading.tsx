import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function PrescriptionTemplatesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-5 w-5 shrink-0 rounded" />
            <Skeleton className="h-8 w-44" />
          </div>
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </div>
      <Separator />
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3">
            <Skeleton className="h-9 min-w-[200px] max-w-xs rounded-lg" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="w-[80px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
