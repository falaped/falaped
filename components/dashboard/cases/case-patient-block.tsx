"use client"

import { CasePatientInfo, CaseNoPatient } from "@/components/dashboard/cases/case-patient-info"
import type { CasePatientDetail } from "@/modules/cases/get-case-by-id"

type CasePatientBlockProps = {
  patient: CasePatientDetail | null
  /** Signed URL (short-lived) resolvida server-side; null cai para iniciais. */
  photoUrl?: string | null
}

export function CasePatientBlock({ patient, photoUrl = null }: CasePatientBlockProps) {
  if (patient) {
    return <CasePatientInfo patient={patient} photoUrl={photoUrl} />
  }
  return <CaseNoPatient />
}
