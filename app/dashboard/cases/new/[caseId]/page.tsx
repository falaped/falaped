import { notFound, redirect } from "next/navigation"
import { format } from "date-fns"
import { tz } from "@date-fns/tz"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { getPhoneByProfileId } from "@/modules/authenticated-users/get-phone-by-profile-id"
import { getPreviousCaseCarryover } from "@/modules/cases/get-previous-case-carryover"
import { listCaseReminders } from "@/modules/cases/list-case-reminders"
import { getPatientPhotoSignedUrl } from "@/modules/patients/get-patient-photo-signed-url"
import { getPrescriptionsByCaseId } from "@/modules/prescriptions/get-prescriptions-by-case-id"
import { getMedicalCertificatesByCaseId } from "@/modules/medical-certificates/get-medical-certificates-by-case-id"
import { getExamRequestsByCaseId } from "@/modules/exam-requests/get-exam-requests-by-case-id"
import { getReferralsByCaseId } from "@/modules/referrals/get-referrals-by-case-id"
import { getScaleResultsByCase } from "@/modules/patient-scales/get-scale-results-by-case"
import { getScaleResultsByPatient } from "@/modules/patient-scales/get-scale-results-by-patient"
import { listAttachmentsByCase } from "@/modules/patient-attachments/list-attachments-by-case"
import { listAttachmentsByPatient } from "@/modules/patient-attachments/list-attachments-by-patient"
import { listExamReadingsByCase } from "@/modules/exam-readings/list-exam-readings-by-case"
import { getExamReadingPageUrls } from "@/modules/exam-readings/get-exam-reading-page-urls"
import { getMeasurementsByPatient } from "@/modules/patient-growth/get-measurements-by-patient"
import { getPrescriptionTemplatesByProfileId } from "@/modules/prescription-templates/get-prescription-templates-by-profile-id"
import { getExamCatalogItems } from "@/modules/exam-catalog/get-exam-catalog-items"
import { getExamPanelsByProfileId } from "@/modules/exam-panels/get-exam-panels-by-profile-id"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { getCaseReports } from "@/modules/cases/get-case-report"
import { getReportTemplateById } from "@/modules/report-templates/get-report-template-by-id"
import { getDefaultReportTemplate } from "@/modules/report-templates/get-default-report-template"
import { normalizeReportTemplateSections } from "@/modules/report-templates/fixed-template-sections"
import { NewCaseWorkspace } from "@/components/dashboard/cases/new-case-workspace"

export default async function NewCaseWorkspacePage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)

  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const caseDetail = await getCaseById(supabase, caseId, profile.id)
  if (!caseDetail) notFound()
  if (caseDetail.origin !== "dashboard") redirect(`/dashboard/cases/${caseId}`)
  // Encerrada (inclusive pelo "Encerrar consulta" daqui): o detalhe mostra o que ficou.
  if (caseDetail.status !== "active") redirect(`/dashboard/cases/${caseId}`)

  const patientId = caseDetail.patient?.id ?? null
  // Tudo abaixo é apoio: falha vira vazio e a consulta abre do mesmo jeito.
  const [
    phone,
    reminders,
    photoUrl,
    prescriptions,
    certificates,
    examRequests,
    referrals,
    scaleResults,
    attachments,
    examReadings,
    measurements,
    prescriptionTemplates,
    examCatalog,
    examPanels,
    templateRaw,
    caseReports,
  ] = await Promise.all([
    getPhoneByProfileId(supabase, profile.id).catch(() => null),
    listCaseReminders(supabase, profile.id, caseId).catch(() => []),
    getPatientPhotoSignedUrl(supabase, caseDetail.patient?.photo_path ?? null).catch(() => null),
    getPrescriptionsByCaseId(supabase, profile.id, caseId).catch(() => []),
    getMedicalCertificatesByCaseId(supabase, profile.id, caseId).catch(() => []),
    getExamRequestsByCaseId(supabase, profile.id, caseId).catch(() => []),
    getReferralsByCaseId(supabase, profile.id, caseId).catch(() => []),
    // Histórico da criança: o painel separa o desta consulta das vezes anteriores.
    (patientId
      ? getScaleResultsByPatient(supabase, profile.id, patientId)
      : getScaleResultsByCase(supabase, profile.id, caseId)
    ).catch(() => []),
    // Todos os arquivos da criança: o painel marca os desta consulta.
    (patientId
      ? listAttachmentsByPatient(supabase, profile.id, patientId)
      : listAttachmentsByCase(supabase, profile.id, caseId)
    ).catch(() => []),
    listExamReadingsByCase(supabase, profile.id, caseId).catch(() => []),
    patientId ? getMeasurementsByPatient(supabase, profile.id, patientId).catch(() => []) : [],
    getPrescriptionTemplatesByProfileId(supabase, profile.id).catch(() => []),
    getExamCatalogItems(supabase, profile.id).catch(() => []),
    getExamPanelsByProfileId(supabase, profile.id).catch(() => []),
    // Para o Encerrar: o relatório é revisado (e gerado, se faltar) na primeira etapa.
    (profile.report_template_id
      ? getReportTemplateById(supabase, profile.report_template_id)
      : getDefaultReportTemplate(supabase)
    ).catch(() => null),
    getCaseReports(supabase, caseId, profile.id).catch(() => []),
  ])

  // O que a consulta anterior desta criança deixou; sem ela, só não aparece o cartão.
  const previousCarryover =
    phone && patientId
      ? await getPreviousCaseCarryover(supabase, profile.id, phone, patientId, caseId).catch(() => null)
      : null

  const examReadingsWithPages = await Promise.all(
    examReadings.map(async (reading) => ({
      ...reading,
      pageUrls: await getExamReadingPageUrls(supabase, reading.page_paths),
    })),
  )

  // "Hoje" no fuso da clínica: o host pode estar em UTC (ver case-detail-content.tsx).
  const now = new Date()
  const todayIso = format(now, "yyyy-MM-dd", { in: tz(CLINIC_TIME_ZONE) })
  const todayLabel = format(now, "dd/MM/yyyy", { in: tz(CLINIC_TIME_ZONE) })

  return (
    <NewCaseWorkspace
      caseId={caseDetail.id}
      initialMessages={caseDetail.messages}
      patient={caseDetail.patient}
      photoUrl={photoUrl}
      startedAt={caseDetail.started_at}
      consultationPausedMs={caseDetail.consultation_paused_ms}
      consultationPausedAt={caseDetail.consultation_paused_at}
      reminders={reminders}
      previousCarryover={previousCarryover}
      documents={{ prescriptions, certificates, examRequests, referrals }}
      scaleResults={scaleResults}
      attachments={attachments}
      examReadings={examReadingsWithPages}
      measurements={measurements}
      ageMonths={computePediatricAge(caseDetail.patient?.birth_date ?? null, now).totalMonths ?? null}
      todayIso={todayIso}
      todayLabel={todayLabel}
      doctor={{
        first_name: profile.first_name,
        surname: profile.surname,
        crm: profile.crm,
        rqe: profile.rqe,
        default_location_state: profile.default_location_state,
        default_location_city: profile.default_location_city,
      }}
      prescriptionTemplates={prescriptionTemplates}
      examCatalog={examCatalog}
      examPanels={examPanels}
      reportTemplate={
        templateRaw ? { ...templateRaw, sections: normalizeReportTemplateSections(templateRaw.sections) } : null
      }
      caseReports={caseReports}
    />
  )
}
