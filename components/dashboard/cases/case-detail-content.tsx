import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { CaseDetailHeader } from "@/components/dashboard/cases/case-detail-header"
import { CasePatientInfo, CaseNoPatient } from "@/components/dashboard/cases/case-patient-info"
import { CaseChat } from "@/components/dashboard/cases/case-chat"
import { CaseQuickActions } from "@/components/dashboard/cases/case-quick-actions"
import { CaseSummary } from "@/components/dashboard/cases/case-summary"

export async function CaseDetailContent({ id }: { id: string }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")

  const userPhone = profile.status === "paid" ? profile.phone ?? null : null
  if (!userPhone) redirect("/auth/login")

  const caseDetail = await getCaseById(supabase, id, userPhone)

  if (!caseDetail) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <CaseDetailHeader detail={caseDetail} />

      {caseDetail.patient ? (
        <CasePatientInfo patient={caseDetail.patient} />
      ) : (
        <CaseNoPatient />
      )}

      <CaseChat
        messages={caseDetail.messages}
        isActive={caseDetail.status === "active"}
      />
      {caseDetail.messages.length > 0 && <CaseSummary />}
      <CaseQuickActions />
    </div>
  )
}
