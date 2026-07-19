import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { VaccineScheduleWithItems } from "@/modules/vaccines/types"
import { ScheduleProvenance } from "./schedule-provenance"

/**
 * Renders the gestante reference dataset (C5, D-05, VAC-03).
 *
 * A SINGLE list by vaccine with the gestational-week window rendered as text —
 * NOT grouped by trimester (some vaccines cross trimesters). Each row shows the
 * vaccine (+ dose when present) and its `age_label` window phrase ("a partir de
 * 20 semanas", "28–36 semanas", "qualquer momento") as a muted qualifier.
 *
 * Gestante sits on the gestational_weeks axis (D-04) — a different axis than the
 * child calendar; the intro copy makes that explicit. Its own provenance caption
 * + fixed advisory live in the card footer (C6/D-09).
 */
export function GestanteList({
  schedule,
  className,
}: {
  schedule: VaccineScheduleWithItems
  className?: string
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="text-lg tracking-tight">
          Vacinação da gestante
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Vacinação da gestante — janela por semana gestacional. Eixo diferente
          do calendário da criança.
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
                Vacina
              </TableHead>
              <TableHead className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
                Janela
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.vaccine_schedule_items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="align-top text-sm">
                  <span className="font-medium">{item.vaccine}</span>
                  {item.dose ? (
                    <span className="text-muted-foreground"> — {item.dose}</span>
                  ) : null}
                  {item.notes ? (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.notes}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="align-top text-sm text-muted-foreground">
                  {item.age_label}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <ScheduleProvenance schedule={schedule} />
      </CardFooter>
    </Card>
  )
}
