import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { getCaseReports } from "@/modules/cases/get-case-report"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"
import { getReportTemplateById } from "@/modules/report-templates/get-report-template-by-id"
import { getDefaultReportTemplate } from "@/modules/report-templates/get-default-report-template"
import { CaseDetailHeader } from "@/components/dashboard/cases/case-detail-header"
import { CasePatientBlock } from "@/components/dashboard/cases/case-patient-block"
import { CaseChat } from "@/components/dashboard/cases/case-chat"
import { CaseQuickActions } from "@/components/dashboard/cases/case-quick-actions"
import { CaseReport } from "@/components/dashboard/cases/case-report"

export async function CaseDetailContent({ id }: { id: string }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const [caseDetail, patients, template, caseReports] = await Promise.all([
    getCaseById(supabase, id, profile.id),
    getPatientsByProfileId(supabase, profile.id),
    profile.report_template_id
      ? getReportTemplateById(supabase, profile.report_template_id)
      : getDefaultReportTemplate(supabase),
    getCaseReports(supabase, id, profile.id),
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
      {template && (
        <CaseReport
          template={template}
          caseReports={caseReports}
          caseId={id}
          hasMessages={caseDetail.messages.length > 0}
          patientName={caseDetail.patient?.name ?? "Paciente não associado"}
          caseStatus={caseDetail.status}
        />
      )}
      <CaseQuickActions />
    </div>
  )
}
