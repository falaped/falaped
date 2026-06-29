import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { getPatientPhotoSignedUrl } from "@/modules/patients/get-patient-photo-signed-url"
import { getCaseReports } from "@/modules/cases/get-case-report"
import { getReportTemplateById } from "@/modules/report-templates/get-report-template-by-id"
import { getDefaultReportTemplate } from "@/modules/report-templates/get-default-report-template"
import { normalizeReportTemplateSections } from "@/modules/report-templates/fixed-template-sections"
import { formatDashboardChatContextSummaryForDisplay } from "@/modules/dashboard/format-dashboard-chat-context-summary-for-display"
import { getMedicalCertificatesByCaseId } from "@/modules/medical-certificates/get-medical-certificates-by-case-id"
import { getPrescriptionsByCaseId } from "@/modules/prescriptions/get-prescriptions-by-case-id"
import { Separator } from "@/components/ui/separator"
import { CaseDetailCommandStrip } from "@/components/dashboard/cases/case-detail-command-strip"
import { CaseDetailHeader } from "@/components/dashboard/cases/case-detail-header"
import { CaseDetailQuickActions } from "@/components/dashboard/cases/case-detail-quick-actions"
import { CaseDetailDocuments } from "@/components/dashboard/cases/case-detail-documents"
import { CasePatientBlock } from "@/components/dashboard/cases/case-patient-block"
import { CaseDetailStateCard } from "@/components/dashboard/cases/case-detail-state-card"
import { caseDetailMainStackClassName } from "@/components/dashboard/cases/case-detail-workspace"
import { CaseReport } from "@/components/dashboard/cases/case-report"
import { ConsultationTimerWidget } from "@/components/dashboard/cases/consultation-timer-widget"

export async function CaseDetailContent({ id }: { id: string }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")

  const [
    caseDetail,
    templateRaw,
    caseReports,
    caseCertificates,
    casePrescriptions,
  ] = await Promise.all([
    getCaseById(supabase, id, profile.id),
    profile.report_template_id
      ? getReportTemplateById(supabase, profile.report_template_id)
      : getDefaultReportTemplate(supabase),
    getCaseReports(supabase, id, profile.id),
    getMedicalCertificatesByCaseId(supabase, profile.id, id),
    getPrescriptionsByCaseId(supabase, profile.id, id),
  ])

  if (!caseDetail) {
    notFound()
  }

  // Signed URL singular resolvida server-side para o avatar do cabeçalho do caso
  // (helper SINGULAR — não o de lote). Null cai para iniciais (Pitfall 1).
  const casePhotoUrl = await getPatientPhotoSignedUrl(
    supabase,
    caseDetail.patient?.photo_path ?? null,
  )

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
  const templateSectionCount = template?.sections?.length ?? 0

  const reportBlock =
    template != null ? (
      <CaseReport
        template={template}
        caseReports={caseReports}
        caseId={id}
        hasMessages={messages.length > 0}
        patientName={caseDetail.patient?.name ?? "Paciente não associado"}
        suppressInternalGenerateButtons
      />
    ) : (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhum modelo de relatório disponível para este perfil.
      </div>
    )

  return (
    <div className={caseDetailMainStackClassName}>
      <CaseDetailHeader detail={caseDetail} />
      <CasePatientBlock patient={caseDetail.patient} photoUrl={casePhotoUrl} />
      <Separator />
      <CaseDetailCommandStrip
        caseId={id}
        status={caseDetail.status}
        origin={caseDetail.origin}
      />
      <div>
        <CaseDetailQuickActions
          caseId={id}
          patient={caseDetail.patient}
          hasMessages={messages.length > 0}
          templateSectionCount={templateSectionCount}
          hasTemplate={template != null}
          caseReports={caseReports.map((r) => ({ source: r.source }))}
        />
      </div>
      <div className="flex flex-col gap-6">
        <CaseDetailStateCard
          startedAt={caseDetail.started_at}
          isActive={isActive}
          messageCount={messages.length}
          lastMessageAt={lastMessage?.created_at ?? null}
          contextSummaryDisplay={contextSummaryDisplay}
          clinicalSummaryDisplayUnavailable={clinicalSummaryDisplayUnavailable}
        />
        {reportBlock}
        <CaseDetailDocuments
          certificates={caseCertificates}
          prescriptions={casePrescriptions}
        />
      </div>
      <ConsultationTimerWidget
        caseId={id}
        startedAt={caseDetail.started_at}
        endedAt={caseDetail.ended_at}
        consultationPausedMs={caseDetail.consultation_paused_ms}
        consultationPausedAt={caseDetail.consultation_paused_at}
      />
    </div>
  )
}
