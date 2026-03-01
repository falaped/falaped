import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"
import { PatientsToolbarAndList } from "@/components/dashboard/patients/patients-toolbar-and-list"

export async function PatientsContent() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const patients = await getPatientsByProfileId(supabase, profile.id)
  return <PatientsToolbarAndList patients={patients} />
}
