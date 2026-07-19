"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ExamRequestWizard } from "@/components/dashboard/exam-requests/exam-request-wizard"
import type { Patient } from "@/modules/patients/types"
import type { ExamCatalogItem } from "@/modules/exam-catalog/types"
import type { ExamPanel } from "@/modules/exam-panels/types"
import type { ExamRequestTemplateOption } from "@/modules/exam-request-templates/get-exam-request-templates-by-profile-id"
import type { ExamRequestTemplateSnapshot } from "@/modules/exam-request-templates/types"

const NEW_EXAM_REQUEST_PATH = "/dashboard/exam-requests/new"

type ExamRequestWizardProfile = {
  id: string
  first_name: string | null
  surname: string | null
  crm: string | null
  rqe?: string | null
  default_location_state?: string | null
  default_location_city?: string | null
}

type ExamRequestWizardWrapperProps = {
  patients: Patient[]
  profile: ExamRequestWizardProfile
  examCatalogItems: ExamCatalogItem[]
  examPanels: ExamPanel[]
  examRequestTemplates?: ExamRequestTemplateOption[]
  initialTemplate?: { snapshot: ExamRequestTemplateSnapshot } | null
  initialPatientId?: string | null
  initialCaseId?: string | null
}

/**
 * Wraps ExamRequestWizard with a key from URL _t param so each visit gets a fresh instance.
 * If URL has no _t, we replace with _t=timestamp so the wizard always has a unique key.
 */
export function ExamRequestWizardWrapper({
  patients,
  profile,
  examCatalogItems,
  examPanels,
  examRequestTemplates,
  initialTemplate,
  initialPatientId = null,
  initialCaseId = null,
}: ExamRequestWizardWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const _t = searchParams.get("_t")
  const [fallbackKey] = useState(() => String(Date.now()))

  useEffect(() => {
    if (pathname !== NEW_EXAM_REQUEST_PATH || _t) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("_t", String(Date.now()))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, _t, searchParams, router])

  return (
    <ExamRequestWizard
      key={_t ?? fallbackKey}
      patients={patients}
      profile={profile}
      examCatalogItems={examCatalogItems}
      examPanels={examPanels}
      examRequestTemplates={examRequestTemplates}
      initialTemplate={initialTemplate}
      initialPatientId={initialPatientId}
      initialCaseId={initialCaseId}
    />
  )
}
