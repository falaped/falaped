import {
  UserIcon,
  PhoneIcon,
  AlertTriangleIcon,
  CakeIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { formatBrazilianPhone, formatDate } from "@/lib/formatters"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { formatPatientSexForDisplay } from "@/modules/patients/patient-sex"
import type { CasePatientDetail } from "@/modules/cases/get-case-by-id"

export function CasePatientInfo({
  patient,
  photoUrl = null,
}: {
  patient: CasePatientDetail
  /** Signed URL (short-lived); null cai para iniciais (Pitfall 1). */
  photoUrl?: string | null
}) {
  const formattedPhone = patient.contact_phone
    ? formatBrazilianPhone(patient.contact_phone)
    : null

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0 border border-border/80">
            {photoUrl ? (
              <AvatarImage src={photoUrl} alt={`Foto de ${patient.name}`} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {getPatientInitials(patient.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">{patient.name}</CardTitle>
            <CardDescription>Dados do paciente neste caso</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-5">
        <div className="flex w-full flex-wrap items-center justify-start gap-6 sm:gap-8">
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
                <p className="font-medium">{formattedPhone}</p>
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

          {formatPatientSexForDisplay(patient.sex) ? (
            <div>
              <div className="flex items-center gap-2 text-sm">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">
                  {formatPatientSexForDisplay(patient.sex)}
                </p>
              </div>
            </div>
          ) : null}
          <div className="hidden h-8 w-px bg-border sm:block" />
          {patient.allergies && (
            <div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangleIcon className="h-4 w-4 text-destructive" />
                <p className="font-medium text-destructive">
                  {patient.allergies}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function CaseNoPatient() {
  return (
    <Card className="border-dashed border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-muted-foreground">
          Paciente
        </CardTitle>
        <CardDescription>Nenhum paciente vinculado a este caso.</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <UserIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Use <span className="font-medium">Associar paciente</span> no cabeçalho
            para vincular a ficha pediátrica.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
