import { notFound, redirect } from "next/navigation"
import { format } from "date-fns"
import { tz } from "@date-fns/tz"

import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
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
import { getCaseEarningsTotals } from "@/modules/financial-entries/get-case-earnings-totals"
import { listFinancialEntries } from "@/modules/financial-entries/list-financial-entries"
import { getScaleResultsByCase } from "@/modules/patient-scales/get-scale-results-by-case"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { Separator } from "@/components/ui/separator"
import { CaseDetailCommandStrip } from "@/components/dashboard/cases/case-detail-command-strip"
import { CaseDetailHeader } from "@/components/dashboard/cases/case-detail-header"
import { CaseDetailQuickActions } from "@/components/dashboard/cases/case-detail-quick-actions"
import { CaseDetailDocuments } from "@/components/dashboard/cases/case-detail-documents"
import { CasePatientBlock } from "@/components/dashboard/cases/case-patient-block"
import { CaseDetailStateCard } from "@/components/dashboard/cases/case-detail-state-card"
import { CaseEarningsCard } from "@/components/dashboard/cases/case-earnings-card"
import { CasePendingEarningsCard } from "@/components/dashboard/cases/case-pending-earnings-card"
import { caseDetailMainStackClassName } from "@/components/dashboard/cases/case-detail-workspace"
import { CaseReport } from "@/components/dashboard/cases/case-report"
import { ConsultationTimerWidget } from "@/components/dashboard/cases/consultation-timer-widget"
import { ScalesSection } from "@/components/dashboard/scales/scales-section"

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
    earningsTotals,
    caseEntries,
    scaleResults,
  ] = await Promise.all([
    getCaseById(supabase, id, profile.id),
    profile.report_template_id
      ? getReportTemplateById(supabase, profile.report_template_id)
      : getDefaultReportTemplate(supabase),
    getCaseReports(supabase, id, profile.id),
    getMedicalCertificatesByCaseId(supabase, profile.id, id),
    getPrescriptionsByCaseId(supabase, profile.id, id),
    // `null` em falha, nunca throw: `null` é o que faz o diálogo de exclusão BLOQUEAR
    // (S7 partial), e derrubar a página inteira por causa de uma contagem seria pior.
    getCaseEarningsTotals(supabase, profile.id, id).catch(() => null),
    // Aqui os anulados VÊM: o card do caso os mostra riscados, sem filtro próprio. Em
    // falha, lista vazia — o card simplesmente não renderiza, sem derrubar a página.
    listFinancialEntries(supabase, profile.id, {
      caseId: id,
      includeVoided: true,
    }).catch(() => []),
    // Lista vazia em falha, nunca throw: escala é apoio — derrubar a consulta
    // inteira porque a leitura do histórico falhou seria pior que não mostrá-lo.
    getScaleResultsByCase(supabase, profile.id, id).catch(() => []),
  ])

  if (!caseDetail) {
    notFound()
  }

  // Hoje no fuso da CLÍNICA, derivado aqui e descido como prop até o campo
  // `Recebido em`. Um componente cliente num host em UTC derivaria o dia SEGUINTE
  // depois das 21h de Brasília, e o lançamento cairia no bucket errado — em silêncio,
  // sem erro de tipo e sem falha de build. Mesma derivação de app/dashboard/earnings/page.tsx.
  const todayLabel = format(new Date(), "dd/MM/yyyy", { in: tz(CLINIC_TIME_ZONE) })

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

  // Idade em meses inteiros da criança deste caso: filtra quais escalas são
  // oferecidas. Sem paciente associado, não há escala a aplicar.
  const caseAgeMonths =
    computePediatricAge(caseDetail.patient?.birth_date ?? null, new Date())
      .totalMonths ?? null

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
      <CaseDetailHeader
        detail={caseDetail}
        earningsCount={earningsTotals?.count ?? null}
        earningsTotalCents={earningsTotals?.totalCents ?? null}
        todayLabel={todayLabel}
      />
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
        {caseEntries.length > 0 && earningsTotals != null ? (
          <CaseEarningsCard
            entries={caseEntries}
            count={earningsTotals.count}
            totalCents={earningsTotals.totalCents}
          />
        ) : null}
        {/* Caso encerrado sem lançamento não-anulado E com a pergunta ainda em aberto:
            convida a lançar. Ancorado no ESTADO e não no evento de encerramento, porque
            três dos quatro caminhos que encerram um caso rodam no servidor (assistente,
            novo atendimento sobre o ativo, chamada direta) e nunca puderam abrir o
            diálogo. `earnings_prompted_at` preenchido = o médico já respondeu (lançou ou
            dispensou como cortesia) e a pergunta é UMA VEZ por caso — sem essa condição a
            cortesia deixava o card para sempre na tela. `earningsTotals == null` = leitura
            falhou → não convida, para não arriscar duplicata. */}
        {!isActive &&
        earningsTotals != null &&
        earningsTotals.count === 0 &&
        caseDetail.earnings_prompted_at == null ? (
          <CasePendingEarningsCard caseId={id} todayLabel={todayLabel} />
        ) : null}
        {reportBlock}
        <CaseDetailDocuments
          certificates={caseCertificates}
          prescriptions={casePrescriptions}
        />
        {caseDetail.patient ? (
          <ScalesSection
            patientId={caseDetail.patient.id}
            caseId={id}
            ageMonths={caseAgeMonths}
            results={scaleResults}
            title="Escalas desta consulta"
            description="Escalas aplicadas neste atendimento. O registro fica no histórico do paciente."
          />
        ) : null}
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
