import {
  UserIcon,
  PhoneIcon,
  AlertTriangleIcon,
  BabyIcon,
  CakeIcon,
} from "lucide-react"

import { formatDate, formatBrazilianPhone } from "@/lib/formatters"
import type { CasePatientDetail } from "@/modules/cases/get-case-by-id"



export function CasePatientInfo({ patient }: { patient: CasePatientDetail }) {
  const formattedPhone = patient.contact_phone ? formatBrazilianPhone(patient.contact_phone) : null

  return (
    <div className="rounded-xl bg-card p-5">
      <div className="flex items-center justify-start gap-8 flex-wrap w-full">

        {patient.responsible && (
          <div>
            <div className="flex items-center gap-2 text-sm">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">{patient.responsible}</p>
            </div>
          </div>
        )}
        <div className="hidden h-8 w-px bg-border sm:block" />

        {formattedPhone && (
          <div>
            <div className="flex items-center gap-2 text-sm">
              <PhoneIcon className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">
                {formattedPhone}
              </p>
            </div>
          </div>
        )}
        <div className="hidden h-8 w-px bg-border sm:block" />

        {patient.birth_date && (
          <div>
            <div className="flex items-center gap-2 text-sm">
              <CakeIcon className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">{formatDate(patient.birth_date)}</p>
            </div>
          </div>
        )}
        <div className="hidden h-8 w-px bg-border sm:block" />

        {patient.sex && (
          <div>
            <div className="flex items-center gap-2 text-sm">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">
                {patient.sex === "M" ? "Masculino" : patient.sex === "F" ? "Feminino" : patient.sex}
              </p>
            </div>
          </div>
        )}
        <div className="hidden h-8 w-px bg-border sm:block" />
        {patient.allergies && (
          <div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangleIcon className="h-4 w-4 text-destructive" />
              <p className="font-medium text-destructive">{patient.allergies}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function CaseNoPatient() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <UserIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Sem paciente associado
          </p>
          <p className="text-xs text-muted-foreground/70">
            Este caso ainda não possui um paciente vinculado. Use &quot;Associar paciente&quot; ao lado do status para vincular.
          </p>
        </div>
      </div>
    </div>
  )
}
