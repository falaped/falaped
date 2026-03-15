"use client"

import { useState } from "react"
import { PrescriptionWizard } from "@/components/dashboard/prescriptions/prescription-wizard"
import type { Patient } from "@/modules/patients/types"
import type { PrescriptionTemplateOption } from "@/modules/prescription-templates/get-prescription-templates-by-profile-id"
import type { PrescriptionTemplateSnapshot } from "@/modules/prescription-templates/types"

type PrescriptionWizardProfile = {
  id: string
  first_name: string | null
  surname: string | null
  crm: string | null
}

type PrescriptionWizardWrapperProps = {
  patients: Patient[]
  profile: PrescriptionWizardProfile
  prescriptionTemplates?: PrescriptionTemplateOption[]
  initialTemplate?: { snapshot: PrescriptionTemplateSnapshot } | null
}

/**
 * Wraps PrescriptionWizard with a key that changes on every mount.
 * When the user navigates away and back to Nova receita, the page remounts,
 * this wrapper remounts, and the new key forces the wizard to remount with fresh state.
 */
export function PrescriptionWizardWrapper({
  patients,
  profile,
  prescriptionTemplates,
  initialTemplate,
}: PrescriptionWizardWrapperProps) {
  const [mountKey] = useState(() => Date.now())
  return (
    <PrescriptionWizard
      key={mountKey}
      patients={patients}
      profile={profile}
      prescriptionTemplates={prescriptionTemplates}
      initialTemplate={initialTemplate}
    />
  )
}
