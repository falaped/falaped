import { redirect } from "next/navigation"
import { UserIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getProfileByAuthUserId } from "@/modules/profiles/get-profile-by-auth-user-id"
import { ProfileContent } from "./profile-content"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const profile = await getProfileByAuthUserId(supabase, user.id)
  if (!profile) redirect("/auth/login")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2.5">
          <UserIcon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie suas informações de conta.
        </p>
      </div>

      <ProfileContent profile={profile} />
    </div>
  )
}
