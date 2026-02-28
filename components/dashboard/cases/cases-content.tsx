import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCasesByUserPhone } from "@/modules/cases/get-cases-by-user-phone"
import { CasesToolbarAndList } from "@/components/dashboard/cases/cases-toolbar"

export async function CasesContent() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")

  const userPhone = profile.status === "paid" ? profile.phone ?? null : null
  if (!userPhone) redirect("/auth/login")

  const cases = await getCasesByUserPhone(supabase, userPhone)
  return <CasesToolbarAndList cases={cases} />
}
