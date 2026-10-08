import { redirect } from "next/navigation"

import { DocumentsList } from "@/components/dashboard/documents/documents-list"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { listDocumentsByProfile } from "@/modules/documents/list-documents-by-profile"
import { getPrescriptionTemplatesByProfileId } from "@/modules/prescription-templates/get-prescription-templates-by-profile-id"
import { getExamCatalogItems } from "@/modules/exam-catalog/get-exam-catalog-items"
import { getExamPanelsByProfileId } from "@/modules/exam-panels/get-exam-panels-by-profile-id"

/** Documentos (protótipo c1): no padrão das listas, topo em destaque e a lista com abas. */
export async function DocumentsContent() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const [rows, prescriptionTemplates, examCatalog, examPanels] = await Promise.all([
    listDocumentsByProfile(supabase, profile.id),
    // Apoio dos painéis: falha vira vazio e a lista abre do mesmo jeito.
    getPrescriptionTemplatesByProfileId(supabase, profile.id).catch(() => []),
    getExamCatalogItems(supabase, profile.id).catch(() => []),
    getExamPanelsByProfileId(supabase, profile.id).catch(() => []),
  ])

  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-6">
      <DocumentsList
        rows={rows}
        nowIso={new Date().toISOString()}
        panelData={{
          doctor: {
            first_name: profile.first_name,
            surname: profile.surname,
            crm: profile.crm,
            rqe: profile.rqe,
            default_location_state: profile.default_location_state,
            default_location_city: profile.default_location_city,
          },
          prescriptionTemplates,
          examCatalog,
          examPanels,
        }}
      />
    </div>
  )
}
