import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"
import { CaseDetailHeader } from "@/components/dashboard/cases/case-detail-header"
import { CasePatientBlock } from "@/components/dashboard/cases/case-patient-block"
import { CaseChat } from "@/components/dashboard/cases/case-chat"
import { CaseQuickActions } from "@/components/dashboard/cases/case-quick-actions"
import { CaseSummary } from "@/components/dashboard/cases/case-summary"

export async function CaseDetailContent({ id }: { id: string }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const [caseDetail, patients] = await Promise.all([
    getCaseById(supabase, id, profile.id),
    getPatientsByProfileId(supabase, profile.id),
  ])

  if (!caseDetail) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <CaseDetailHeader detail={caseDetail} patients={patients} />

      <CasePatientBlock patient={caseDetail.patient} />

      <CaseChat
        messages={caseDetail.messages}
        isActive={caseDetail.status === "active"}
      />
      {caseDetail.messages.length > 0 && <CaseSummary />}
      <CaseQuickActions />
    </div>
  )
}
