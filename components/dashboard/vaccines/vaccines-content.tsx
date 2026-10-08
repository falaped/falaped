import { redirect } from "next/navigation"

import { VaccinesView, type VaccineChild } from "@/components/dashboard/vaccines/vaccines-view"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { createClient } from "@/lib/supabase/server"
import { resolveCurrentBandLabel } from "@/lib/vaccine-current-band-items"
import { computeCurrentMonths } from "@/lib/vaccine-current-band"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getVaccineScheduleWithItems } from "@/modules/vaccines/get-vaccine-schedule-with-items"

/**
 * Calendário de vacinas (protótipo f1–f2): referência global, só consulta.
 * `?patientId` destaca a faixa atual da criança; a criança é lida escopada ao médico,
 * então um id alheio cai na página sem destaque.
 */
export async function VaccinesContent({ searchParams }: { searchParams: Promise<{ patientId?: string }> }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const { patientId } = await searchParams
  const [patient, sus, sbim, gestante] = await Promise.all([
    patientId ? getPatientById(supabase, patientId, profile.id) : null,
    getVaccineScheduleWithItems(supabase, "SUS"),
    getVaccineScheduleWithItems(supabase, "SBIm"),
    getVaccineScheduleWithItems(supabase, "gestante"),
  ])

  let child: VaccineChild | null = null
  if (patient) {
    const age = patient.birth_date ? computePediatricAge(patient.birth_date, new Date(), patient.gestational_age_weeks) : null
    child = {
      id: patient.id,
      name: patient.name,
      age: age ? formatPediatricAgeShort(age) : null,
      band: age ? resolveCurrentBandLabel([sus, sbim], computeCurrentMonths(age)) : null,
    }
  }

  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-6">
      <VaccinesView sus={sus} sbim={sbim} gestante={gestante} child={child} />
    </div>
  )
}
