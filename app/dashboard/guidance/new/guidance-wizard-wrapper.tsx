"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { GuidanceWizard } from "@/components/dashboard/guidance/guidance-wizard"
import type { Patient } from "@/modules/patients/types"
import type { GuidanceTemplate } from "@/modules/guidance/types"

const NEW_GUIDANCE_PATH = "/dashboard/guidance/new"

type GuidanceWizardProfile = {
  id: string
  first_name: string | null
  surname: string | null
  crm: string | null
  rqe?: string | null
  default_location_state?: string | null
  default_location_city?: string | null
}

type GuidanceWizardWrapperProps = {
  patients: Patient[]
  profile: GuidanceWizardProfile
  templates: GuidanceTemplate[]
  initialPatientId?: string | null
  initialCaseId?: string | null
}

/**
 * Wraps GuidanceWizard with a key from URL _t param so each visit gets a fresh instance.
 * If URL has no _t, we replace with _t=timestamp so the wizard always has a unique key.
 */
export function GuidanceWizardWrapper({
  patients,
  profile,
  templates,
  initialPatientId = null,
  initialCaseId = null,
}: GuidanceWizardWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const _t = searchParams.get("_t")
  const [fallbackKey] = useState(() => String(Date.now()))

  useEffect(() => {
    if (pathname !== NEW_GUIDANCE_PATH || _t) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("_t", String(Date.now()))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, _t, searchParams, router])

  return (
    <GuidanceWizard
      key={_t ?? fallbackKey}
      patients={patients}
      profile={profile}
      templates={templates}
      initialPatientId={initialPatientId}
      initialCaseId={initialCaseId}
    />
  )
}
