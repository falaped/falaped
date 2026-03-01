import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { PatientDetailView } from "@/components/dashboard/patients/patient-detail-view"

export async function PatientDetailContent({ id }: { id: string }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")

  const userPhone =
    profile.status === "paid" ? profile.phone ?? null : null
  if (!userPhone) redirect("/auth/login")

  const patient = await getPatientById(supabase, id, userPhone)
  if (!patient) notFound()

  return <PatientDetailView patient={patient} />
}
