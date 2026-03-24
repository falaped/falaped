import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCaseById } from "@/modules/cases/get-case-by-id"
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
  if (caseDetail.status !== "active") redirect("/dashboard/cases")

  return (
    <NewCaseWorkspace
      caseId={caseDetail.id}
      initialMessages={caseDetail.messages}
      patient={caseDetail.patient}
      userDisplayName={profile.first_name?.trim() || "Pediatra"}
    />
  )
}

