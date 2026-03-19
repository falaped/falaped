"use server"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCaseReportById } from "@/modules/cases/get-case-report"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { getProfileDefaultLocation } from "@/modules/profiles/get-profile-default-location"
import { buildReportPdf } from "@falaped/falaped-kit/pdf"

export type DownloadCaseReportPdfResult =
  | { ok: true; pdfBase64: string; filename: string }
  | { ok: false; error: string }

/**
 * Generates the case report PDF and returns base64 + filename for download.
 * Caller must be the profile that owns the report.
 */
export async function downloadCaseReportPdfAction(
  reportId: string,
): Promise<DownloadCaseReportPdfResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }

  if (!reportId || typeof reportId !== "string")
    return { ok: false, error: "ID do relatório inválido." }

  try {
    const report = await getCaseReportById(supabase, reportId, profile.id)
    if (!report)
      return { ok: false, error: "Relatório não encontrado ou você não tem acesso." }

    const caseDetail = await getCaseById(supabase, report.case_id, profile.id)
    const patientName = caseDetail?.patient?.name?.trim() ?? "Paciente não associado"
    const reportDate = report.finalized_at ?? report.created_at
    const dateFormatted = reportDate
      ? format(new Date(reportDate), "dd/MM/yyyy", { locale: ptBR })
      : format(new Date(), "dd/MM/yyyy", { locale: ptBR })
    const consultationDateFormatted =
      reportDate
        ? format(new Date(reportDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
        : format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })

    const doctorName = [profile.first_name, profile.surname].filter(Boolean).join(" ").trim() || "Médico(a)"
    const doctorCrm = profile.crm?.trim() ?? ""
    const consultationLocation = getProfileDefaultLocation(profile)
    const logoFooter = (profile.logo_url_full ?? profile.logo_url_short)?.trim() || undefined

    const sections = (report.sections ?? [])
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ title: s.name, content: s.content ?? "—" }))

    const datapdf = {
      patientName,
      date: dateFormatted,
      sections,
      doctorName,
      doctorCrm,
      consultationDateFormatted,
      consultationLocation: consultationLocation !== "—" ? consultationLocation : undefined,
      logoFooter,
    }
    console.log("datapdf", datapdf)
    const buffer = await buildReportPdf(datapdf)

    const pdfBase64 = buffer.toString("base64")
    const safeName = patientName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "") || "relatorio"
    const filename = `relatorio-${safeName}-${dateFormatted.replace(/\//g, "-")}.pdf`
    return { ok: true, pdfBase64, filename }
  } catch (e) {
    console.error("[CASES] downloadCaseReportPdf failed", e)
    return {
      ok: false,
      error: "Erro ao gerar PDF do relatório. Tente novamente.",
    }
  }
}
