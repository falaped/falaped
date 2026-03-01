import { redirect } from "next/navigation"
import { LockIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { LinkWhatsAppContent } from "./link-whatsapp-content"

export default async function LinkWhatsAppPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")

  const whatsappLinkedAt = profile.whatsapp_linked_at

  console.log(profile)
  return (
    <div className="flex flex-col gap-6 items-center container mx-auto">
      <div className="max-w-4xl w-full">
        <div className="flex items-start gap-2.5">
          <LockIcon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Vincular WhatsApp</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Gere um código no dashboard e envie no WhatsApp para vincular seu número à sua conta.
        </p>
      </div>

      <LinkWhatsAppContent
        linkedPhone={profile.phone}
        whatsappLinkedAt={whatsappLinkedAt}
      />
    </div>
  )
}
