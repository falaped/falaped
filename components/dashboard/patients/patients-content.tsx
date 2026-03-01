import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientsByUserPhone } from "@/modules/patients/get-patients-by-user-phone"
import { PatientsToolbarAndList } from "@/components/dashboard/patients/patients-toolbar-and-list"

export async function PatientsContent() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")

  const userPhone =
    profile.status === "paid" ? profile.phone ?? null : null
  if (!userPhone) redirect("/auth/login")

  const patients = await getPatientsByUserPhone(supabase, userPhone)
  return <PatientsToolbarAndList patients={patients} />
}
