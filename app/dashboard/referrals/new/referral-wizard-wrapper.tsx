"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ReferralWizard } from "@/components/dashboard/referrals/referral-wizard"
import type { Patient } from "@/modules/patients/types"
import type { ReferralTemplateOption } from "@/modules/referral-templates/get-referral-templates-by-profile-id"
import type { ReferralTemplateSnapshot } from "@/modules/referral-templates/types"

const NEW_REFERRAL_PATH = "/dashboard/referrals/new"

type ReferralWizardProfile = {
  id: string
  first_name: string | null
  surname: string | null
  crm: string | null
  rqe?: string | null
  default_location_state?: string | null
  default_location_city?: string | null
}

type ReferralWizardWrapperProps = {
  patients: Patient[]
  profile: ReferralWizardProfile
  referralTemplates?: ReferralTemplateOption[]
  initialTemplate?: { snapshot: ReferralTemplateSnapshot } | null
  initialPatientId?: string | null
  initialCaseId?: string | null
}

/**
 * Wraps ReferralWizard with a key from URL _t param so each visit gets a fresh instance.
 * If URL has no _t, we replace with _t=timestamp so the wizard always has a unique key.
 */
export function ReferralWizardWrapper({
  patients,
  profile,
  referralTemplates,
  initialTemplate,
  initialPatientId = null,
  initialCaseId = null,
}: ReferralWizardWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const _t = searchParams.get("_t")
  const [fallbackKey] = useState(() => String(Date.now()))

  useEffect(() => {
    if (pathname !== NEW_REFERRAL_PATH || _t) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("_t", String(Date.now()))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, _t, searchParams, router])

  return (
    <ReferralWizard
      key={_t ?? fallbackKey}
      patients={patients}
      profile={profile}
      referralTemplates={referralTemplates}
      initialTemplate={initialTemplate}
      initialPatientId={initialPatientId}
      initialCaseId={initialCaseId}
    />
  )
}
