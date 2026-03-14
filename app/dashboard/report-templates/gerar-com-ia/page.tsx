import { redirect } from "next/navigation"
import Link from "next/link"
import { Sparkles, ChevronLeft } from "lucide-react"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createClient } from "@/lib/supabase/server"
import { GenerateWithAiContent } from "@/components/dashboard/report-templates/generate-with-ai-content"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default async function GerarComIaPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="Voltar">
          <Link href="/dashboard/report-templates">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Gerar template com IA
          </h1>
        </div>
      </div>

      <Separator />

      <GenerateWithAiContent />
    </div>
  )
}
