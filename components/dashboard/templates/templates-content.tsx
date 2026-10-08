import { redirect } from "next/navigation"

import { TemplatesView, type TemplatesTab } from "@/components/dashboard/templates/templates-view"
import { createClient } from "@/lib/supabase/server"
import { getExamPanelsByProfileId } from "@/modules/exam-panels/get-exam-panels-by-profile-id"
import { getPrescriptionTemplatesByProfileId } from "@/modules/prescription-templates/get-prescription-templates-by-profile-id"
import { getReportTemplatesByProfileId } from "@/modules/report-templates/get-report-templates-by-profile-id"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

const TABS: Record<string, TemplatesTab> = { receitas: "prescriptions", exames: "exams", relatorio: "reports" }

/** Modelos (protótipo g1–g3): receitas, painéis de exame e relatório numa tela só, por `?aba=`. */
export async function TemplatesContent({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const { aba } = await searchParams
  const [prescriptions, exams, reports] = await Promise.all([
    getPrescriptionTemplatesByProfileId(supabase, profile.id),
    getExamPanelsByProfileId(supabase, profile.id),
    getReportTemplatesByProfileId(supabase, profile.id),
  ])
  // Sem escolha no Perfil, o relatório usa o modelo do Falaped.
  const activeReportId = profile.report_template_id ?? reports.find((t) => t.is_default)?.id ?? null

  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-6">
      <TemplatesView
        initialTab={TABS[aba ?? ""] ?? "prescriptions"}
        prescriptions={prescriptions}
        exams={exams}
        reports={reports}
        activeReportId={activeReportId}
      />
    </div>
  )
}
