import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { getCasesByPatientId } from "@/modules/cases/get-cases-by-patient-id"
import { PatientDetailView } from "@/components/dashboard/patients/patient-detail-view"

export async function PatientDetailContent({ id }: { id: string }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const patient = await getPatientById(supabase, id, profile.id)
  if (!patient) notFound()

  const userPhone = profile.phone ?? null
  const cases =
    userPhone ?
      await getCasesByPatientId(supabase, userPhone, patient.id)
    : []

  return <PatientDetailView patient={patient} cases={cases} />
}
