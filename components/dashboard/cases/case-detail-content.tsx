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
import { getMedicalCertificatesByCaseId } from "@/modules/medical-certificates/get-medical-certificates-by-case-id"
import { getPrescriptionsByCaseId } from "@/modules/prescriptions/get-prescriptions-by-case-id"
import { getExamRequestsByCaseId } from "@/modules/exam-requests/get-exam-requests-by-case-id"
import { getReferralsByCaseId } from "@/modules/referrals/get-referrals-by-case-id"
import { getCaseEarningsTotals } from "@/modules/financial-entries/get-case-earnings-totals"
import { listFinancialEntries } from "@/modules/financial-entries/list-financial-entries"
import { getScaleResultsByCase } from "@/modules/patient-scales/get-scale-results-by-case"
import { listAttachmentsByCase } from "@/modules/patient-attachments/list-attachments-by-case"
import { listExamReadingsByCase } from "@/modules/exam-readings/list-exam-readings-by-case"
import { getExamReadingPageUrls } from "@/modules/exam-readings/get-exam-reading-page-urls"
import { getPhoneByProfileId } from "@/modules/authenticated-users/get-phone-by-profile-id"
import { getPreviousCaseCarryover } from "@/modules/cases/get-previous-case-carryover"
import { listCaseReminders } from "@/modules/cases/list-case-reminders"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { CaseDetailHeader } from "@/components/dashboard/cases/case-detail-header"
import { CaseDetailDocuments, toCaseDocuments } from "@/components/dashboard/cases/case-detail-documents"
import { CaseBillingCard } from "@/components/dashboard/cases/case-billing-card"
import { CaseReport } from "@/components/dashboard/cases/case-report"
import { ConsultationTimerWidget } from "@/components/dashboard/cases/consultation-timer-widget"
import { ScalesSection } from "@/components/dashboard/scales/scales-section"
import { AttachmentsSection } from "@/components/dashboard/attachments/attachments-section"
import { ExamReadingsSection } from "@/components/dashboard/exam-readings/exam-readings-section"
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
  // sem erro de tipo e sem falha de build. Mesma derivação de app/dashboard/earnings/page.tsx.
  const todayLabel = format(new Date(), "dd/MM/yyyy", { in: tz(CLINIC_TIME_ZONE) })

  // Signed URL singular resolvida server-side para o avatar do cabeçalho do caso
  // (helper SINGULAR — não o de lote). Null cai para iniciais (Pitfall 1).
  const casePhotoUrl = await getPatientPhotoSignedUrl(
    supabase,
    caseDetail.patient?.photo_path ?? null,
  )

  // Páginas dos exames lidos: signed URLs inline, resolvidas aqui e nunca persistidas.
  const examReadingsWithPages = await Promise.all(
    caseExamReadings.map(async (reading) => ({
      ...reading,
      pageUrls: await getExamReadingPageUrls(supabase, reading.page_paths),
    })),
  )

  const template =
    templateRaw != null
      ? {
          ...templateRaw,
          sections: normalizeReportTemplateSections(templateRaw.sections),
        }
      : null

  const messages = caseDetail.messages

  // Idade em meses inteiros da criança deste caso: filtra quais escalas são
  // oferecidas. Sem paciente associado, não há escala a aplicar.
  const caseAgeMonths =
    computePediatricAge(caseDetail.patient?.birth_date ?? null, new Date())
      .totalMonths ?? null

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

  // "06/10 · 09:10 · 22 min" no fuso da clínica; a duração desconta as pausas.
  const inClinic = { in: tz(CLINIC_TIME_ZONE) }
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
  const whenLabel = [
    format(caseDetail.started_at, "dd/MM", inClinic),
    format(caseDetail.started_at, "HH:mm", inClinic),
    durationMin ? `${durationMin} min` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  const patient = caseDetail.patient
  const hasExtras =
    patient != null &&
    (scaleResults.length > 0 || examReadingsWithPages.length > 0 || caseAttachments.length > 0)

  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-6">
      <CaseDetailHeader
        detail={caseDetail}
        photoUrl={casePhotoUrl}
        whenLabel={whenLabel}
        documentHrefs={documents.map((doc) => doc.href)}
        earningsCount={earningsTotals?.count ?? null}
        earningsTotalCents={earningsTotals?.totalCents ?? null}
        todayLabel={todayLabel}
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
          <CaseDetailDocuments caseId={id} patientId={patient?.id ?? null} documents={documents} />
          <CaseBillingCard
            caseId={id}
            todayLabel={todayLabel}
            entries={caseEntries}
            totals={earningsTotals}
            prompted={caseDetail.earnings_prompted_at != null}
          />
          <CaseRemindersCard caseId={id} initialReminders={caseReminders} />
          {hasExtras ? null : (
            <p className="px-1 text-caption text-subtle-foreground">
              Escalas, exames e anexos aparecem aqui quando a consulta tiver algum.
            </p>
          )}
        </div>
      </div>
      {/* Só o que a consulta teve: seção vazia aqui seria ruído numa consulta encerrada. */}
      {patient && scaleResults.length > 0 ? (
        <ScalesSection
          patientId={patient.id}
          caseId={id}
          ageMonths={caseAgeMonths}
          results={scaleResults}
          title="Escalas desta consulta"
          description="O registro fica também no histórico do paciente."
        />
      ) : null}
      {patient && examReadingsWithPages.length > 0 ? (
        <ExamReadingsSection patientId={patient.id} caseId={id} readings={examReadingsWithPages} />
      ) : null}
      {patient && caseAttachments.length > 0 ? (
        <AttachmentsSection
          patientId={patient.id}
          caseId={id}
          attachments={caseAttachments}
          title="Anexos desta consulta"
          description="Ficam guardados também na ficha da criança."
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
