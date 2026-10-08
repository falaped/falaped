import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { getPatientPhotoSignedUrl } from "@/modules/patients/get-patient-photo-signed-url"
import { PatientForm } from "./patient-form"

/** Editar ficha (protótipo b7): carrega a criança e a foto e entrega ao formulário. */
export async function PatientEditContent({ id }: { id: string }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const patient = await getPatientById(supabase, id, profile.id)
  if (!patient) notFound()
  const photoUrl = await getPatientPhotoSignedUrl(supabase, patient.photo_path)

  return <PatientForm mode="edit" patient={patient} photoUrl={photoUrl} />
}
