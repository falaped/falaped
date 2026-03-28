import Link from "next/link"
import { FileTextIcon, Pill, UserIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { CasePatientDetail } from "@/modules/cases/get-case-by-id"

type CasePatientChartLinkProps = {
  patient: CasePatientDetail | null
}

/**
 * CTAs to patient chart, new certificate, and new prescription (with optional patient prefill via query).
 */
export function CasePatientChartLink({ patient }: CasePatientChartLinkProps) {
  if (patient) {
    const patientQuery = `patientId=${encodeURIComponent(patient.id)}`
    return (
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="gap-2" asChild>
          <Link href={`/dashboard/patients/${patient.id}`}>
            <UserIcon className="h-4 w-4 shrink-0" aria-hidden />
            Ver ficha do paciente
          </Link>
        </Button>
        <Button variant="outline" className="gap-2" asChild>
          <Link href={`/dashboard/medical-certificates/new?${patientQuery}`}>
            <FileTextIcon className="h-4 w-4 shrink-0" aria-hidden />
            Novo atestado
          </Link>
        </Button>
        <Button variant="outline" className="gap-2" asChild>
          <Link href={`/dashboard/prescriptions/new?${patientQuery}`}>
            <Pill className="h-4 w-4 shrink-0" aria-hidden />
            Nova receita
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <p className="text-sm text-muted-foreground">
      Nenhum paciente vinculado a este caso.
    </p>
  )
}
