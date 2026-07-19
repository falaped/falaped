"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { MedicalReportWizard } from "@/components/dashboard/medical-reports/medical-report-wizard"
import type { Patient } from "@/modules/patients/types"
import type { MedicalReportTemplateOption } from "@/modules/medical-report-templates/get-medical-report-templates-by-profile-id"
import type { MedicalReportTemplateSnapshot } from "@/modules/medical-report-templates/types"

const NEW_MEDICAL_REPORT_PATH = "/dashboard/medical-reports/new"

type MedicalReportWizardProfile = {
  id: string
  first_name: string | null
  surname: string | null
  crm: string | null
  rqe?: string | null
  default_location_state?: string | null
  default_location_city?: string | null
}

type MedicalReportWizardWrapperProps = {
  patients: Patient[]
  profile: MedicalReportWizardProfile
  medicalReportTemplates?: MedicalReportTemplateOption[]
  initialTemplate?: { snapshot: MedicalReportTemplateSnapshot } | null
  initialPatientId?: string | null
  initialCaseId?: string | null
}

/**
 * Wraps MedicalReportWizard with a key from URL _t param so each visit gets a fresh instance.
 * If URL has no _t, we replace with _t=timestamp so the wizard always has a unique key.
 */
export function MedicalReportWizardWrapper({
  patients,
  profile,
  medicalReportTemplates,
  initialTemplate,
  initialPatientId = null,
  initialCaseId = null,
}: MedicalReportWizardWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const _t = searchParams.get("_t")
  const [fallbackKey] = useState(() => String(Date.now()))

  useEffect(() => {
    if (pathname !== NEW_MEDICAL_REPORT_PATH || _t) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("_t", String(Date.now()))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, _t, searchParams, router])

  return (
    <MedicalReportWizard
      key={_t ?? fallbackKey}
      patients={patients}
      profile={profile}
      medicalReportTemplates={medicalReportTemplates}
      initialTemplate={initialTemplate}
      initialPatientId={initialPatientId}
      initialCaseId={initialCaseId}
    />
  )
}
