import { redirect } from "next/navigation"
import { SmartphoneIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { LinkWhatsAppContent } from "./link-whatsapp-content"

export default async function LinkWhatsAppPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")
  const linkedPhone =
    profile?.whatsapp_linked_at != null && profile?.phone?.trim()
      ? profile.phone.trim()
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

      <LinkWhatsAppContent linkedPhone={linkedPhone} />
    </div>
  )
}
