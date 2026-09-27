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
import { CaseDetailDocuments } from "@/components/dashboard/cases/case-detail-documents"
import { CaseSectionCards, type CaseSection } from "@/components/dashboard/cases/case-section-cards"
import { CaseStatusCard } from "@/components/dashboard/cases/case-status-card"
import { CaseResumeCard } from "@/components/dashboard/cases/case-resume-card"
import { CaseEarningsCard } from "@/components/dashboard/cases/case-earnings-card"
import { CasePendingEarningsCard } from "@/components/dashboard/cases/case-pending-earnings-card"
import { caseDetailMainStackClassName } from "@/components/dashboard/cases/case-detail-workspace"
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

  // Ordem pedida pelo gestor: relatório, escalas, exames, anexos, documentos,
  // lembretes, ganhos. Escalas/anexos/exames só existem com paciente vinculado.
  const patientSections: CaseSection[] = caseDetail.patient
    ? [
        {
          key: "scales",
          title: "Escalas da consulta",
          description: "Escalas aplicadas neste atendimento.",
          content: (
            <ScalesSection
              patientId={caseDetail.patient.id}
              caseId={id}
              ageMonths={caseAgeMonths}
              results={scaleResults}
              title="Escalas desta consulta"
              description="Escalas aplicadas neste atendimento. O registro fica no histórico do paciente."
            />
          ),
        },
        {
          key: "exams",
          title: "Leitura de exames",
          description: "Exames lidos pela IA neste atendimento.",
          content: (
            <ExamReadingsSection
              patientId={caseDetail.patient.id}
              caseId={id}
              readings={examReadingsWithPages}
            />
          ),
        },
        {
          key: "attachments",
          title: "Anexos da consulta",
          description: "Arquivos enviados neste atendimento.",
          content: (
            <AttachmentsSection
              patientId={caseDetail.patient.id}
              caseId={id}
              attachments={caseAttachments}
              title="Anexos desta consulta"
              description="Arquivos enviados neste atendimento. Ficam guardados na ficha da criança."
            />
          ),
        },
      ]
    : []

  const sections: CaseSection[] = [
    {
      key: "report",
      title: "Relatório do atendimento",
      description: "Relatórios gerados a partir da consulta.",
      content: reportBlock,
    },
    ...patientSections,
    {
      key: "documents",
      title: "Documentos do caso",
      description: "Receitas e atestados deste atendimento.",
      content: (
        <CaseDetailDocuments
          caseId={id}
          patientId={caseDetail.patient?.id ?? null}
          certificates={caseCertificates}
          prescriptions={casePrescriptions}
        />
      ),
    },
    {
      key: "reminders",
      title: "Lembretes e pendências",
      description: "O que retomar na próxima consulta.",
      content: (
        <CaseRemindersCard caseId={id} initialReminders={caseReminders} />
      ),
    },
    ...(caseEntries.length > 0 && earningsTotals != null
      ? [
          {
            key: "earnings" as const,
            title: "Ganhos deste atendimento",
            description: "Lançamentos financeiros vinculados a este caso.",
            content: (
              <CaseEarningsCard
                caseId={id}
                todayLabel={todayLabel}
                entries={caseEntries}
                count={earningsTotals.count}
                totalCents={earningsTotals.totalCents}
              />
            ),
          },
        ]
      : []),
  ]

  return (
    <div className={caseDetailMainStackClassName}>
      <CaseDetailHeader
        detail={caseDetail}
        photoUrl={casePhotoUrl}
        earningsCount={earningsTotals?.count ?? null}
        earningsTotalCents={earningsTotals?.totalCents ?? null}
      />
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
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Registros do atendimento</h2>
        <CaseSectionCards
          sections={sections}
          leading={
            // Só o atendimento em curso conduzido no painel tem workspace para retomar.
            isActive && caseDetail.origin === "dashboard" ? (
              <CaseResumeCard caseId={id} />
            ) : null
          }
          trailing={
            <CaseStatusCard
              caseId={id}
              status={caseDetail.status}
              todayLabel={todayLabel}
            />
          }
        />
      </section>
      {previousCarryover && caseDetail.patient ? (
        <PreviousCaseSummaryDialog
          carryover={previousCarryover}
          patientName={caseDetail.patient.name}
        />
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
