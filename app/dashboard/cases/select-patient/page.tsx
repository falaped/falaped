import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"
import { getCasesByProfileId } from "@/modules/cases/get-cases-by-profile-id"
import { SelectPatientWorkspace } from "@/components/dashboard/cases/select-patient-workspace"

export default async function SelectPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>
}) {
  const { patientId } = await searchParams
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)

  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const patients = await getPatientsByProfileId(supabase, profile.id)
  const cases = await getCasesByProfileId(supabase, profile)
  const activeCaseByPatientId = cases
    .filter((caseItem) => caseItem.status === "active" && caseItem.patient_id)
    .reduce<Record<string, { id: string; origin: "dashboard" | "whatsapp" }>>(
      (accumulator, caseItem) => {
        const patientId = caseItem.patient_id as string
        if (!accumulator[patientId]) {
          accumulator[patientId] = { id: caseItem.id, origin: caseItem.origin }
        }
        return accumulator
      },
      {},
    )

  return (
    <SelectPatientWorkspace
      patients={patients}
      initialPatientId={patientId ?? null}
      activeCaseByPatientId={activeCaseByPatientId}
    />
  )
}

