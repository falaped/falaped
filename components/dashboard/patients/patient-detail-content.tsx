import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { getCasesByPatientId } from "@/modules/cases/get-cases-by-patient-id"
import { getMedicalCertificatesByPatientId } from "@/modules/medical-certificates/get-medical-certificates-by-patient-id"
import { getPrescriptionsByPatientId } from "@/modules/prescriptions/get-prescriptions-by-patient-id"
import { PatientDetailView } from "./patient-detail-view"

export async function PatientDetailContent({ id }: { id: string }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const patient = await getPatientById(supabase, id, profile.id)
  if (!patient) notFound()

  const [cases, certificates, prescriptions] = await Promise.all([
    getCasesByPatientId(supabase, profile.id, patient.id),
    getMedicalCertificatesByPatientId(supabase, profile.id, patient.id),
    getPrescriptionsByPatientId(supabase, profile.id, patient.id),
  ])

  return (
    <PatientDetailView
      key={patient.id}
      patient={patient}
      cases={cases}
      certificates={certificates}
      prescriptions={prescriptions}
    />
  )
}
