import { redirect } from "next/navigation"
import { SmartphoneIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getProfileByAuthUserId } from "@/modules/profiles/get-profile-by-auth-user-id"
import { getAuthenticatedUserByProfileId } from "@/modules/authenticated-users/get-authenticated-user-by-profile-id"
import { VincularWhatsAppContent } from "./vinculacao-whatsapp-content"

export default async function VinculacaoWhatsAppPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const profile = await getProfileByAuthUserId(supabase, user.id)
  if (!profile) redirect("/auth/login")

  const authenticatedUser = await getAuthenticatedUserByProfileId(
    supabase,
    profile.id
  )
  const linkedPhone =
    authenticatedUser?.whatsapp_linked_at != null &&
    authenticatedUser?.phone?.trim()
      ? authenticatedUser.phone.trim()
      : null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2.5">
          <SmartphoneIcon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Vincular WhatsApp</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Gere um código no dashboard e envie no WhatsApp para vincular seu número à sua conta.
        </p>
      </div>

      <VincularWhatsAppContent linkedPhone={linkedPhone} />
    </div>
  )
}
