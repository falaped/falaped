import Link from "next/link"
import { UserIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { CasePatientDetail } from "@/modules/cases/get-case-by-id"

type CasePatientChartLinkProps = {
  patient: CasePatientDetail | null
}

/**
 * Replaces the inline patient card with a single CTA to the patient chart.
 */
export function CasePatientChartLink({ patient }: CasePatientChartLinkProps) {
  if (patient) {
    return (
      <Button variant="outline" className="w-full gap-2 sm:w-auto" asChild>
        <Link href={`/dashboard/patients/${patient.id}`}>
          <UserIcon className="h-4 w-4 shrink-0" aria-hidden />
          Ver ficha do paciente
        </Link>
      </Button>
    )
  }

  return (
    <p className="text-sm text-muted-foreground">
      Nenhum paciente vinculado a este caso.
    </p>
  )
}
