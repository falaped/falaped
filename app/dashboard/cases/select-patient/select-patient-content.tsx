import { redirect } from "next/navigation"

import { SelectPatientWorkspace } from "@/components/dashboard/cases/select-patient-workspace"
import { createClient } from "@/lib/supabase/server"
import { getCasesByProfileId } from "@/modules/cases/get-cases-by-profile-id"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export async function SelectPatientContent({
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
        const patientIdKey = caseItem.patient_id as string
        if (!accumulator[patientIdKey]) {
          accumulator[patientIdKey] = { id: caseItem.id, origin: caseItem.origin }
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
