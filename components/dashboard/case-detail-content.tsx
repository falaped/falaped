import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUserPhone } from "@/lib/get-authenticated-user-phone"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { CaseDetailHeader } from "@/components/dashboard/case-detail-header"
import { CasePatientInfo, CaseNoPatient } from "@/components/dashboard/case-patient-info"
import { CaseChat } from "@/components/dashboard/case-chat"
import { CaseQuickActions } from "@/components/dashboard/case-quick-actions"
import { CaseSummary } from "@/components/dashboard/case-summary"

export async function CaseDetailContent({ id }: { id: string }) {
  const supabase = await createClient()
  const userPhone = await getAuthenticatedUserPhone(supabase)

  if (!userPhone) {
    redirect("/auth/login")
  }

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

      <CaseQuickActions />

      {caseDetail.messages.length > 0 && <CaseSummary />}
      <CaseChat
        messages={caseDetail.messages}
        isActive={caseDetail.status === "active"}
      />
    </div>
  )
}
