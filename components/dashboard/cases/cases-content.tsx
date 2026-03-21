import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCasesByProfileId } from "@/modules/cases/get-cases-by-profile-id"
import { CasesToolbarAndList } from "@/components/dashboard/cases/cases-toolbar"

export async function CasesContent() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")

  const cases = await getCasesByProfileId(supabase, profile)
  return <CasesToolbarAndList cases={cases} />
}
