import { redirect } from "next/navigation"
import { Share2, Plus } from "lucide-react"
import { NewReferralLink } from "./new/new-referral-link"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getReferralsByProfileId } from "@/modules/referrals/get-referrals-by-profile-id"
import { ReferralTable } from "@/components/dashboard/referrals/referral-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function ReferralsPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const referrals = await getReferralsByProfileId(supabase, profile.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Share2 className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Encaminhamentos
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os encaminhamentos gerados.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <NewReferralLink>
            <Plus className="mr-2 h-4 w-4" />
            Novo encaminhamento
          </NewReferralLink>
        </Button>
      </div>

      <Separator />

      {referrals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
              <Share2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">
              Nenhum encaminhamento gerado.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Gere o primeiro encaminhamento para um paciente.
            </p>
            <Button asChild className="mt-5">
              <NewReferralLink>
                <Plus className="mr-2 h-4 w-4" />
                Novo encaminhamento
              </NewReferralLink>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ReferralTable referrals={referrals} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
