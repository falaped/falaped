import { redirect } from "next/navigation"
import { UserIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getReportTemplatesForUserPhone } from "@/modules/report-templates/get-report-templates-for-user-phone"
import { ProfileContent } from "./profile-content"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")

  const reportTemplateOptions = await getReportTemplatesForUserPhone(
    supabase,
    profile.phone
  )

  return (
    <div className="flex flex-col gap-6 items-center container mx-auto">
      <div className="max-w-4xl w-full">
        <div className="flex items-start gap-2.5">
          <UserIcon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie suas informações de conta.
        </p>
      </div>

      <ProfileContent
        profile={profile}
        reportTemplateOptions={reportTemplateOptions}
      />
    </div>
  )
}
