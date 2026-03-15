import type { PrescriptionMedication } from "@/modules/prescriptions/types"

export type PrescriptionTemplateSnapshot = {
  medications: PrescriptionMedication[]
  orientations?: string
  warningSigns?: string
  additionalNotes?: string
  locationState?: string
}

export type PrescriptionTemplate = {
  id: string
  profile_id: string
  name: string
  snapshot: PrescriptionTemplateSnapshot
  created_at: string
  updated_at: string
}

export type PrescriptionTemplateOption = {
  id: string
  name: string
  created_at: string
  snapshot: PrescriptionTemplateSnapshot
}
