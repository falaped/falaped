import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { getPhoneByProfileId } from "@/modules/authenticated-users/get-phone-by-profile-id"
import { getPreviousCaseCarryover } from "@/modules/cases/get-previous-case-carryover"
import { listCaseReminders } from "@/modules/cases/list-case-reminders"
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

  // O que a consulta anterior desta criança deixou. Falha aqui não pode impedir
  // o atendimento: sem carryover, o workspace abre normal, só sem o modal.
  const phone = await getPhoneByProfileId(supabase, profile.id).catch(() => null)
  const previousCarryover =
    phone && caseDetail.patient?.id
      ? await getPreviousCaseCarryover(
          supabase,
          profile.id,
          phone,
          caseDetail.patient.id,
          caseDetail.id,
        ).catch(() => null)
      : null

  const reminders = await listCaseReminders(
    supabase,
    profile.id,
    caseDetail.id,
  ).catch(() => [])

  return (
    <NewCaseWorkspace
      caseId={caseDetail.id}
      initialMessages={caseDetail.messages}
      patient={caseDetail.patient}
      userDisplayName={profile.first_name?.trim() || "Pediatra"}
      startedAt={caseDetail.started_at}
      endedAt={caseDetail.ended_at}
      consultationPausedMs={caseDetail.consultation_paused_ms}
      consultationPausedAt={caseDetail.consultation_paused_at}
      reminders={reminders}
      previousCarryover={previousCarryover}
    />
  )
}

