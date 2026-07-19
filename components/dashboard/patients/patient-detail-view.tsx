"use client"

import { useLayoutEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PatientForm } from "@/components/dashboard/patients/patient-form"
import { PatientDetailHero } from "@/components/dashboard/patients/patient-detail-hero"
import { PatientDetailToolbar } from "@/components/dashboard/patients/patient-detail-toolbar"
import { PatientClinicalOverview } from "@/components/dashboard/patients/patient-clinical-overview"
import { PatientVaccineAgeCard } from "@/components/dashboard/patients/patient-vaccine-age-card"
import { PatientDetailTimeline } from "@/components/dashboard/patients/patient-detail-timeline"
import { GrowthSection } from "@/components/dashboard/patients/growth/growth-section"
import { deletePatientAction } from "@/actions"
import type { Patient } from "@/modules/patients/types"
import type { Measurement } from "@/modules/patient-growth/types"
import type { CaseForPatient } from "@/modules/cases/get-cases-by-patient-id"
import type { MedicalCertificateListItem } from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"
import type { PrescriptionListItem } from "@/modules/prescriptions/types"
import type { VaccineScheduleWithItems } from "@/modules/vaccines/types"

export function PatientDetailView({
  patient,
  cases = [],
  certificates = [],
  prescriptions = [],
  photoUrl = null,
  measurements = [],
  vaccineSus = null,
  vaccineSbim = null,
}: {
  patient: Patient
  cases?: CaseForPatient[]
  certificates?: MedicalCertificateListItem[]
  prescriptions?: PrescriptionListItem[]
  /** Signed URL (short-lived) resolved server-side for the hero avatar; null falls back to initials. */
  photoUrl?: string | null
  measurements?: Measurement[]
  /** Global reference calendars (D-07) for the in-profile current-age card; null degrades gracefully. */
  vaccineSus?: VaccineScheduleWithItems | null
  vaccineSbim?: VaccineScheduleWithItems | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isEditing, setIsEditing] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Next.js may reuse this client boundary when navigating between patients or
  // when restoring from the client router cache; reset edit mode on route/patient change.
  useLayoutEffect(() => {
    setIsEditing(false)
  }, [pathname, patient.id])

  function handleUpdateSuccess() {
    router.refresh()
    setIsEditing(false)
  }

  async function handleConfirmDelete(): Promise<boolean> {
    setDeleteLoading(true)
    try {
      const result = await deletePatientAction(patient.id)
      if (result.ok) {
        toast.success("Paciente excluído.")
        router.push("/dashboard/patients")
        return true
      }
      toast.error(getFriendlyToastMessage(result.error))
      return false
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {isEditing ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{patient.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Edição da ficha cadastral e clínica</p>
          </div>
          <PatientDetailToolbar
            patientId={patient.id}
            isEditing={isEditing}
            deleteLoading={deleteLoading}
            onEdit={() => setIsEditing(true)}
            onCancelEdit={() => setIsEditing(false)}
            onConfirmDelete={handleConfirmDelete}
          />
        </div>
      ) : (
        <PatientDetailHero
          patient={patient}
          photoUrl={photoUrl}
          className="w-full"
          onEditRequest={() => setIsEditing(true)}
          toolbar={
            <PatientDetailToolbar
              patientId={patient.id}
              isEditing={isEditing}
              deleteLoading={deleteLoading}
              onEdit={() => setIsEditing(true)}
              onCancelEdit={() => setIsEditing(false)}
              onConfirmDelete={handleConfirmDelete}
            />
          }
        />
      )}

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Editar dados</CardTitle>
            <CardDescription>Atualize as informações do paciente e salve.</CardDescription>
          </CardHeader>
          <CardContent>
            <PatientForm
              mode="edit"
              patient={patient}
              photoUrl={photoUrl}
              onUpdateSuccess={handleUpdateSuccess}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <PatientClinicalOverview patient={patient} />
          <PatientVaccineAgeCard
            patientId={patient.id}
            birthDate={patient.birth_date}
            gestationalAgeWeeks={patient.gestational_age_weeks}
            sus={vaccineSus}
            sbim={vaccineSbim}
          />
          <GrowthSection patient={patient} measurements={measurements} />
          <PatientDetailTimeline
            cases={cases}
            certificates={certificates}
            prescriptions={prescriptions}
          />
        </>
      )}
    </div>
  )
}
