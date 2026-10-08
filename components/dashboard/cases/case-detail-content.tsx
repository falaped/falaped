import { notFound, redirect } from "next/navigation"
import { format } from "date-fns"
import { tz } from "@date-fns/tz"
import { ptBR } from "date-fns/locale"

import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { listCaseActivityTimes } from "@/modules/cases/list-case-activity-times"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { getPatientPhotoSignedUrl } from "@/modules/patients/get-patient-photo-signed-url"
import { getCaseReports } from "@/modules/cases/get-case-report"
import { getReportTemplateById } from "@/modules/report-templates/get-report-template-by-id"
import { getDefaultReportTemplate } from "@/modules/report-templates/get-default-report-template"
import { normalizeReportTemplateSections } from "@/modules/report-templates/fixed-template-sections"
import { getMedicalCertificatesByCaseId } from "@/modules/medical-certificates/get-medical-certificates-by-case-id"
import { getPrescriptionsByCaseId } from "@/modules/prescriptions/get-prescriptions-by-case-id"
import { getExamRequestsByCaseId } from "@/modules/exam-requests/get-exam-requests-by-case-id"
import { getReferralsByCaseId } from "@/modules/referrals/get-referrals-by-case-id"
import { getCaseEarningsTotals } from "@/modules/financial-entries/get-case-earnings-totals"
import { listFinancialEntries } from "@/modules/financial-entries/list-financial-entries"
import { getScaleResultsByCase } from "@/modules/patient-scales/get-scale-results-by-case"
import { listAttachmentsByCase } from "@/modules/patient-attachments/list-attachments-by-case"
import { listExamReadingsByCase } from "@/modules/exam-readings/list-exam-readings-by-case"
import { getMeasurementsByPatient } from "@/modules/patient-growth/get-measurements-by-patient"
import { caseSummaryHeadline } from "@/lib/case-summary-headline"
import { getPhoneByProfileId } from "@/modules/authenticated-users/get-phone-by-profile-id"
import { getPreviousCaseCarryover } from "@/modules/cases/get-previous-case-carryover"
import { listCaseReminders } from "@/modules/cases/list-case-reminders"
import { CaseDetailHeader } from "@/components/dashboard/cases/case-detail-header"
import { CaseDetailDocuments, toCaseDocuments } from "@/components/dashboard/cases/case-detail-documents"
import { CaseBillingCard } from "@/components/dashboard/cases/case-billing-card"
import { CaseReport } from "@/components/dashboard/cases/case-report"
import { ConsultationTimerWidget } from "@/components/dashboard/cases/consultation-timer-widget"
import { CaseConsultSummary } from "@/components/dashboard/cases/case-consult-summary"
import { CasePendingStrip } from "@/components/dashboard/cases/case-pending-strip"
import { CaseClosedDialog } from "@/components/dashboard/cases/case-closed-dialog"
import { formatCentsToBRL } from "@/lib/formatters"
import { CaseRemindersCard } from "@/components/dashboard/cases/case-reminders-card"
import { PreviousCaseSummaryDialog } from "@/components/dashboard/cases/previous-case-summary-dialog"

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
    caseAttachments,
    caseReminders,
    caseExamReadings,
    caseExamRequests,
    caseReferrals,
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
    listAttachmentsByCase(supabase, profile.id, id).catch(() => []),
    listCaseReminders(supabase, profile.id, id).catch(() => []),
    listExamReadingsByCase(supabase, profile.id, id).catch(() => []),
    getExamRequestsByCaseId(supabase, profile.id, id).catch(() => []),
    getReferralsByCaseId(supabase, profile.id, id).catch(() => []),
  ])

  if (!caseDetail) {
    notFound()
  }

  // Consulta aberta do painel tem um lugar só: a própria consulta (protótipo a5). Os
  // documentos emitidos dela voltam por aqui (caseDocumentsHref) e caem lá.
  if (caseDetail.status === "active" && caseDetail.origin === "dashboard") {
    redirect(`/dashboard/cases/new/${id}`)
  }

  // Hoje no fuso da CLÍNICA, derivado aqui e descido como prop até o campo
  // `Recebido em`. Um componente cliente num host em UTC derivaria o dia SEGUINTE
  // depois das 21h de Brasília, e o lançamento cairia no bucket errado — em silêncio,
  // sem erro de tipo e sem falha de build. Mesma derivação de components/dashboard/financial/financial-content.tsx.
  const todayLabel = format(new Date(), "dd/MM/yyyy", { in: tz(CLINIC_TIME_ZONE) })

  // Consulta aberta (WhatsApp): o Encerrar precisa saber se ela ficou esquecida.
  const activityAts =
    caseDetail.status === "active"
      ? await listCaseActivityTimes(supabase, id, caseDetail.patient?.id ?? null, caseDetail.started_at).catch(() => [])
      : []

  // Signed URL singular resolvida server-side para o avatar do cabeçalho do caso
  // (helper SINGULAR — não o de lote). Null cai para iniciais (Pitfall 1).
  const casePhotoUrl = await getPatientPhotoSignedUrl(
    supabase,
    caseDetail.patient?.photo_path ?? null,
  )

  // A medida é ligada à data, não ao caso: entram as do dia da consulta (no fuso da
  // clínica), venham da consulta ou da ficha. Falha vira lista vazia.
  const consultDay = format(caseDetail.started_at, "yyyy-MM-dd", { in: tz(CLINIC_TIME_ZONE) })
  const dayMeasurements = caseDetail.patient
    ? (
        await getMeasurementsByPatient(supabase, profile.id, caseDetail.patient.id).catch(() => [])
      ).filter((m) => m.measured_on === consultDay)
    : []

  const template =
    templateRaw != null
      ? {
          ...templateRaw,
          sections: normalizeReportTemplateSections(templateRaw.sections),
        }
      : null

  const messages = caseDetail.messages

  const isActive = caseDetail.status === "active"

  // O que a consulta anterior desta criança deixou. Só vale a pena mostrar num
  // atendimento EM CURSO: abrir um caso antigo para consultar não é começar a
  // próxima consulta. Falha vira null — nunca derruba a página do caso.
  const previousCarryover =
    isActive && caseDetail.patient?.id
      ? await (async () => {
          const phone = await getPhoneByProfileId(supabase, profile.id).catch(
            () => null,
          )
          if (!phone) return null
          return getPreviousCaseCarryover(
            supabase,
            profile.id,
            phone,
            caseDetail.patient!.id,
            caseDetail.id,
          ).catch(() => null)
        })()
      : null

  const documents = toCaseDocuments({
    prescriptions: casePrescriptions,
    certificates: caseCertificates,
    examRequests: caseExamRequests,
    referrals: caseReferrals,
  })

  // Rótulos do cabeçalho no fuso da clínica; a duração desconta as pausas.
  const inClinic = { in: tz(CLINIC_TIME_ZONE), locale: ptBR }
  const durationMin = caseDetail.ended_at
    ? Math.max(
        1,
        Math.round(
          (Date.parse(caseDetail.ended_at) -
            Date.parse(caseDetail.started_at) -
            (caseDetail.consultation_paused_ms ?? 0)) /
            60_000,
        ),
      )
    : null
  const weekday = format(caseDetail.started_at, "EEE", inClinic).replace(".", "")
  const whenLabel = [
    `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${format(caseDetail.started_at, "dd/MM", inClinic)}`,
    caseDetail.ended_at
      ? `${format(caseDetail.started_at, "HH:mm", inClinic)} às ${format(caseDetail.ended_at, "HH:mm", inClinic)}`
      : format(caseDetail.started_at, "HH:mm", inClinic),
  ].join(" · ")

  const patient = caseDetail.patient
  const latestReport = caseReports[0] ?? null

  return (
    <div className="flex flex-col gap-8">
      <CaseDetailHeader
        detail={caseDetail}
        photoUrl={casePhotoUrl}
        dayLabel={format(caseDetail.started_at, "dd/MM", inClinic)}
        whenLabel={whenLabel}
        durationLabel={durationMin ? `${durationMin} min` : null}
        reason={caseSummaryHeadline(caseDetail.summary)}
        documents={documents}
        template={template}
        caseReports={caseReports}
        reminders={caseReminders}
        earningsCount={earningsTotals?.count ?? null}
        earningsTotalCents={earningsTotals?.totalCents ?? null}
        todayLabel={todayLabel}
        activityAts={activityAts}
      />
      <div className="flex w-full max-w-[1440px] flex-col gap-6">
      {/* Cobrança pendente: encerrada, sem lançamento e sem resposta. `earningsTotals == null`
          (leitura falhou) não convida a lançar, para não arriscar duplicata. */}
      <CasePendingStrip
        caseId={id}
        todayLabel={todayLabel}
        reportDraft={latestReport != null && !latestReport.is_finalized}
        billingPending={
          !isActive &&
          earningsTotals != null &&
          earningsTotals.count === 0 &&
          caseDetail.earnings_prompted_at == null
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        {template != null ? (
          <CaseReport
            template={template}
            caseReports={caseReports}
            caseId={id}
            hasMessages={messages.length > 0}
          />
        ) : (
          <section className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
            Nenhum modelo de relatório disponível para este perfil.
          </section>
        )}
        <div className="flex flex-col gap-5">
          {patient ? (
            <CaseConsultSummary
              patientId={patient.id}
              measurements={dayMeasurements}
              scaleResults={scaleResults}
              examReadings={caseExamReadings}
              attachments={caseAttachments}
            />
          ) : null}
          <CaseDetailDocuments
            caseId={id}
            caseDate={format(caseDetail.started_at, "dd/MM", inClinic)}
            patientId={patient?.id ?? null}
            documents={documents}
          />
          <CaseBillingCard
            caseId={id}
            todayLabel={todayLabel}
            entries={caseEntries}
            totals={earningsTotals}
            prompted={caseDetail.earnings_prompted_at != null}
          />
          <CaseRemindersCard
            caseId={id}
            initialReminders={caseReminders}
            patientFirstName={patient?.name.split(" ")[0] ?? null}
          />
        </div>
      </div>
      </div>
      {!isActive ? (
        <CaseClosedDialog
          caseId={id}
          firstName={patient?.name.split(" ")[0] ?? null}
          summary={[
            durationMin ? `${durationMin} min` : null,
            earningsTotals && earningsTotals.count > 0
              ? `${formatCentsToBRL(earningsTotals.totalCents)} lançado`
              : caseDetail.earnings_prompted_at
                ? "sem cobrança"
                : null,
            latestReport ? (latestReport.is_finalized ? "relatório pronto" : "relatório em rascunho") : null,
            caseReminders.length
              ? `${caseReminders.length} ${caseReminders.length === 1 ? "lembrete" : "lembretes"} para a próxima`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          documents={documents}
          reportId={latestReport?.id ?? null}
        />
      ) : null}
      {previousCarryover && patient ? (
        <PreviousCaseSummaryDialog carryover={previousCarryover} patientName={patient.name} />
      ) : null}
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
