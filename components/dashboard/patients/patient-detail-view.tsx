"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { PatientDetailTimeline } from "@/components/dashboard/patients/patient-detail-timeline"
import { deletePatientAction } from "@/actions"
import type { Patient } from "@/modules/patients/types"
import type { CaseForPatient } from "@/modules/cases/get-cases-by-patient-id"
import type { MedicalCertificateListItem } from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"
import type { PrescriptionListItem } from "@/modules/prescriptions/types"

export function PatientDetailView({
  patient,
  cases = [],
  certificates = [],
  prescriptions = [],
}: {
  patient: Patient
  cases?: CaseForPatient[]
  certificates?: MedicalCertificateListItem[]
  prescriptions?: PrescriptionListItem[]
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

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
            onConfirmDelete={handleConfirmDelete}
          />
        </div>
      ) : (
        <PatientDetailHero
          patient={patient}
          className="w-full"
          toolbar={
            <PatientDetailToolbar
              patientId={patient.id}
              isEditing={isEditing}
              deleteLoading={deleteLoading}
              onEdit={() => setIsEditing(true)}
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
              onUpdateSuccess={handleUpdateSuccess}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <PatientClinicalOverview patient={patient} />
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
