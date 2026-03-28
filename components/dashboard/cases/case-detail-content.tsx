import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { getCaseReports } from "@/modules/cases/get-case-report"
import { getReportTemplateById } from "@/modules/report-templates/get-report-template-by-id"
import { getDefaultReportTemplate } from "@/modules/report-templates/get-default-report-template"
import { normalizeReportTemplateSections } from "@/modules/report-templates/fixed-template-sections"
import { formatDashboardChatContextSummaryForDisplay } from "@/modules/dashboard/format-dashboard-chat-context-summary-for-display"
import { Separator } from "@/components/ui/separator"
import { CaseDetailCommandStrip } from "@/components/dashboard/cases/case-detail-command-strip"
import { CaseDetailHeader } from "@/components/dashboard/cases/case-detail-header"
import { CasePatientChartLink } from "@/components/dashboard/cases/case-patient-chart-link"
import { CaseChat } from "@/components/dashboard/cases/case-chat"
import { CaseDetailRelatedLinks } from "@/components/dashboard/cases/case-detail-related-links"
import { CaseDetailStateCard } from "@/components/dashboard/cases/case-detail-state-card"
import { caseDetailMainStackClassName } from "@/components/dashboard/cases/case-detail-workspace"
import { CaseReport } from "@/components/dashboard/cases/case-report"

export async function CaseDetailContent({ id }: { id: string }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")

  const [caseDetail, templateRaw, caseReports] = await Promise.all([
    getCaseById(supabase, id, profile.id),
    profile.report_template_id
      ? getReportTemplateById(supabase, profile.report_template_id)
      : getDefaultReportTemplate(supabase),
    getCaseReports(supabase, id, profile.id),
  ])

  if (!caseDetail) {
    notFound()
  }

  const template =
    templateRaw != null
      ? {
        ...templateRaw,
        sections: normalizeReportTemplateSections(templateRaw.sections),
      }
      : null

  const messages = caseDetail.messages
  const lastMessage =
    messages.length > 0 ? messages[messages.length - 1] : null
  const latestReportRow = caseReports[0] ?? null
  const rawDashboardSummary =
    caseDetail.dashboard_chat_context_summary?.trim() ?? ""
  const contextSummaryDisplay =
    caseDetail.origin === "dashboard"
      ? formatDashboardChatContextSummaryForDisplay(
        caseDetail.dashboard_chat_context_summary,
      )
      : null
  const clinicalSummaryDisplayUnavailable =
    caseDetail.origin === "dashboard" &&
    rawDashboardSummary.length > 0 &&
    contextSummaryDisplay == null

  const isActive = caseDetail.status === "active"
  const latestReport =
    latestReportRow != null
      ? {
        is_finalized: latestReportRow.is_finalized,
        updated_at: latestReportRow.updated_at,
      }
      : null

  const reportBlock =
    template != null ? (
      <CaseReport
        template={template}
        caseReports={caseReports}
        caseId={id}
        hasMessages={messages.length > 0}
        patientName={caseDetail.patient?.name ?? "Paciente não associado"}
      />
    ) : (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhum modelo de relatório disponível para este perfil.
      </div>
    )

  return (
    <div className={caseDetailMainStackClassName}>
      <CaseDetailHeader detail={caseDetail} />
      <Separator />
      <CaseDetailCommandStrip
        caseId={id}
        status={caseDetail.status}
        origin={caseDetail.origin}
      />
      <div>
        <CasePatientChartLink patient={caseDetail.patient} />
      </div>
      <div className="flex flex-col gap-6">
        <CaseDetailStateCard
          startedAt={caseDetail.started_at}
          origin={caseDetail.origin}
          isActive={isActive}
          messageCount={messages.length}
          lastMessageAt={lastMessage?.created_at ?? null}
          latestReport={latestReport}
          contextSummaryDisplay={contextSummaryDisplay}
          clinicalSummaryDisplayUnavailable={clinicalSummaryDisplayUnavailable}
        />
        <CaseChat messages={messages} isActive={isActive} alwaysExpanded />
        <CaseDetailRelatedLinks />
        {reportBlock}
      </div>
    </div>
  )
}
