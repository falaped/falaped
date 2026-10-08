import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getReportTemplatesByProfileId } from "@/modules/report-templates/get-report-templates-by-profile-id"
import { listProcedureCatalogItems } from "@/modules/procedure-catalog/list-procedure-catalog-items"
import { ProfileContent } from "./profile-content"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")

  const [reportTemplateOptions, procedureCatalogItems] = await Promise.all([
    getReportTemplatesByProfileId(supabase, profile.id),
    listProcedureCatalogItems(supabase, profile.id),
  ])

  return (
    <ProfileContent
      profile={profile}
      reportTemplateOptions={reportTemplateOptions}
      procedureCatalogItems={procedureCatalogItems}
    />
  )
}
