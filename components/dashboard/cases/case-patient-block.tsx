"use client"

import { CasePatientInfo, CaseNoPatient } from "@/components/dashboard/cases/case-patient-info"
import type { CasePatientDetail } from "@/modules/cases/get-case-by-id"

type CasePatientBlockProps = {
  patient: CasePatientDetail | null
}

export function CasePatientBlock({ patient }: CasePatientBlockProps) {
  if (patient) {
    return <CasePatientInfo patient={patient} />
  }
  return <CaseNoPatient />
}
