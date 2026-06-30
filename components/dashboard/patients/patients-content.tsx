import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"
import { getPatientsPhotoSignedUrls } from "@/modules/patients/get-patients-photo-signed-urls"
import { PatientsToolbarAndList } from "@/components/dashboard/patients/patients-toolbar-and-list"

// TTL um pouco maior para a lista (still private) — Pitfall 1: planner discretion.
const LIST_SIGNED_URL_EXPIRY_SECONDS = 300

export async function PatientsContent() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const patients = await getPatientsByProfileId(supabase, profile.id)

  // Uma única chamada em lote (sem N+1 na lista — RESEARCH Pattern 3).
  const paths = patients
    .map((p) => p.photo_path)
    .filter((p): p is string => Boolean(p))
  const urlByPath = await getPatientsPhotoSignedUrls(
    supabase,
    paths,
    LIST_SIGNED_URL_EXPIRY_SECONDS,
  )
  const patientsWithPhotos = patients.map((p) => ({
    ...p,
    photoUrl: p.photo_path ? (urlByPath.get(p.photo_path) ?? null) : null,
  }))

  return <PatientsToolbarAndList patients={patientsWithPhotos} />
}
