import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUserPhone } from "@/lib/get-authenticated-user-phone"
import { getCasesByUserPhone, type CaseStatus } from "@/modules/cases/get-cases-by-user-phone"
import { getCaseCountsByUserPhone } from "@/modules/cases/get-case-counts-by-user-phone"
import { CasesToolbarAndList } from "@/components/dashboard/cases-toolbar"

export async function CasesContent({
  statusFilter,
}: {
  statusFilter: CaseStatus
}) {
  const supabase = await createClient()
  const userPhone = await getAuthenticatedUserPhone(supabase)

  if (!userPhone) {
    redirect("/auth/login")
  }

  const [cases, counts] = await Promise.all([
    getCasesByUserPhone(supabase, userPhone, statusFilter),
    getCaseCountsByUserPhone(supabase, userPhone),
  ])

  return <CasesToolbarAndList cases={cases} counts={counts} statusFilter={statusFilter} />
}
