import { AlertTriangleIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Patient } from "@/modules/patients/types"

type PatientClinicalAlertPanelProps = {
  patient: Patient
}

export function PatientClinicalAlertPanel({ patient }: PatientClinicalAlertPanelProps) {
  if (!patient.allergies?.trim() && !patient.current_medications?.trim()) {
    return null
  }

  return (
    <Card className="border-l-4 border-l-destructive bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangleIcon className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
          Alertas clínicos
        </CardTitle>
        <CardDescription>
          Alergias e medicamentos em uso — confira antes de prescrever.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {patient.allergies?.trim() ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Alergias
            </p>
            <p className="mt-1 whitespace-pre-wrap text-foreground">{patient.allergies}</p>
          </div>
        ) : null}
        {patient.current_medications?.trim() ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Medicamentos em uso
            </p>
            <p className="mt-1 whitespace-pre-wrap text-foreground">
              {patient.current_medications}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
