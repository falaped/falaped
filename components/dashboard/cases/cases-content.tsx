import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUserPhone } from "@/lib/get-authenticated-user-phone"
import { getCasesByUserPhone } from "@/modules/cases/get-cases-by-user-phone"
import { CasesToolbarAndList } from "@/components/dashboard/cases/cases-toolbar"

export async function CasesContent() {
  const supabase = await createClient()
  const userPhone = await getAuthenticatedUserPhone(supabase)

  if (!userPhone) {
    redirect("/auth/login")
  }

  const cases = await getCasesByUserPhone(supabase, userPhone)
  return <CasesToolbarAndList cases={cases} />
}
