"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { MedicalCertificateWizard } from "@/components/dashboard/medical-certificates/medical-certificate-wizard"
import type { Patient } from "@/modules/patients/types"

const NEW_MEDICAL_CERTIFICATE_PATH = "/dashboard/medical-certificates/new"

type MedicalCertificateWizardProfile = {
  id: string
  first_name: string | null
  surname: string | null
  crm: string | null
  rqe?: string | null
  default_location_state?: string | null
  default_location_city?: string | null
}

type MedicalCertificateWizardWrapperProps = {
  patients: Patient[]
  profile: MedicalCertificateWizardProfile
  initialPatientId?: string | null
  initialCaseId?: string | null
}

/**
 * Wraps MedicalCertificateWizard with a key from URL _t param so each visit gets a fresh instance.
 * If URL has no _t, we replace with _t=timestamp so the wizard always has a unique key.
 */
export function MedicalCertificateWizardWrapper({
  patients,
  profile,
  initialPatientId = null,
  initialCaseId = null,
}: MedicalCertificateWizardWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const _t = searchParams.get("_t")
  const [fallbackKey] = useState(() => String(Date.now()))

  useEffect(() => {
    if (pathname !== NEW_MEDICAL_CERTIFICATE_PATH || _t) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("_t", String(Date.now()))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, _t, searchParams, router])

  return (
    <MedicalCertificateWizard
      key={_t ?? fallbackKey}
      patients={patients}
      profile={profile}
      initialPatientId={initialPatientId}
      initialCaseId={initialCaseId}
    />
  )
}
