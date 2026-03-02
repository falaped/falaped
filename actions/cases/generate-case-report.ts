"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/formatters"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { getReportTemplateById } from "@/modules/report-templates/get-report-template-by-id"
import { getDefaultReportTemplate } from "@/modules/report-templates/get-default-report-template"
import { createCaseReport } from "@/modules/cases/create-case-report"
import { generateCaseReport as generateCaseReportWithGroq } from "@/modules/groq/generate-case-report"
import type { CaseReportSection } from "@/modules/cases/get-case-report"
import type { CasePatientDetail } from "@/modules/cases/get-case-by-id"
import type { PatientReportContext } from "@/modules/groq/generate-case-report"

export type GenerateCaseReportResult =
  | { ok: true; reportId: string }
  | { ok: false; error: string }

function toPatientReportContext(
  patient: CasePatientDetail | null,
): PatientReportContext | null {
  if (!patient) return null
  const birthDateFormatted = patient.birth_date
    ? formatDate(patient.birth_date)
    : null
  return {
    name: patient.name ?? null,
    birth_date: birthDateFormatted,
    responsible: patient.responsible ?? null,
    contact_phone: patient.contact_phone ?? null,
    sex: patient.sex ?? null,
    legal_guardian: patient.legal_guardian ?? null,
    blood_type: patient.blood_type ?? null,
    weight: patient.weight ?? null,
    height: patient.height ?? null,
    head_circumference: patient.head_circumference ?? null,
    allergies: patient.allergies ?? null,
    current_medications: patient.current_medications ?? null,
    medical_history: patient.medical_history ?? null,
  }
}

/**
 * Generates the case report from the conversation using the effective template (profile's or default).
 * Validates ownership via getCaseById; requires messages to exist.
 */
export async function generateCaseReportAction(
  caseId: string,
): Promise<GenerateCaseReportResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conecte o WhatsApp no perfil." }

  try {
    const caseDetail = await getCaseById(supabase, caseId, profile.id)
    if (!caseDetail)
      return { ok: false, error: "Caso não encontrado ou você não tem acesso." }
    if (caseDetail.messages.length === 0)
      return { ok: false, error: "Necessário ter conversa para gerar o relatório." }

    const template = profile.report_template_id
      ? await getReportTemplateById(supabase, profile.report_template_id)
      : await getDefaultReportTemplate(supabase)
    if (!template || !template.sections.length)
      return { ok: false, error: "Nenhum template de relatório configurado." }

    const messages = caseDetail.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))
    const templateSections = template.sections.map((s) => ({
      name: s.name,
      description: s.description,
    }))

    const patientContext = toPatientReportContext(caseDetail.patient)

    const contentBySection = await generateCaseReportWithGroq(
      messages,
      templateSections,
      patientContext,
    )

    const sections: CaseReportSection[] = template.sections.map((s, order) => ({
      name: s.name,
      description: s.description,
      content: contentBySection[s.name]?.trim() || "Sem informação registrada.",
      order,
    }))

    const reportId = await createCaseReport(supabase, {
      case_id: caseId,
      profile_id: profile.id,
      report_template_id: template.id,
      sections,
      source: "web",
    })

    revalidatePath("/dashboard/cases")
    revalidatePath(`/dashboard/cases/${caseId}`)
    return { ok: true, reportId }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao gerar relatório. Tente novamente."
    return { ok: false, error: message }
  }
}
