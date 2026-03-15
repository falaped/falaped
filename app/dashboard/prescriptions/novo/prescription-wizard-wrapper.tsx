"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { PrescriptionWizard } from "@/components/dashboard/prescriptions/prescription-wizard"
import type { Patient } from "@/modules/patients/types"
import type { PrescriptionTemplateOption } from "@/modules/prescription-templates/get-prescription-templates-by-profile-id"
import type { PrescriptionTemplateSnapshot } from "@/modules/prescription-templates/types"

const NEW_PRESCRIPTION_PATH = "/dashboard/prescriptions/novo"

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
 * Wraps PrescriptionWizard with a key from URL _t param so each visit gets a fresh instance.
 * If URL has no _t, we replace with _t=timestamp so the wizard always has a unique key.
 */
export function PrescriptionWizardWrapper({
  patients,
  profile,
  prescriptionTemplates,
  initialTemplate,
}: PrescriptionWizardWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const _t = searchParams.get("_t")
  const [fallbackKey] = useState(() => String(Date.now()))

  useEffect(() => {
    if (pathname !== NEW_PRESCRIPTION_PATH || _t) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("_t", String(Date.now()))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, _t, searchParams, router])

  return (
    <PrescriptionWizard
      key={_t ?? fallbackKey}
      patients={patients}
      profile={profile}
      prescriptionTemplates={prescriptionTemplates}
      initialTemplate={initialTemplate}
    />
  )
}
