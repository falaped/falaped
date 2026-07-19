import { redirect } from "next/navigation"
import { Syringe } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getVaccineScheduleWithItems } from "@/modules/vaccines/get-vaccine-schedule-with-items"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { VaccineCalendarView } from "@/components/dashboard/vaccines/vaccine-calendar-view"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function VaccinesPage({
  searchParams,
}: {
  // Optional patient entry point (D-03): `?patientId` opens the calendar with the
  // child's current age band highlighted. Absent → standalone (no highlight).
  searchParams?: Promise<{ patientId?: string }>
}) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  // Paid gate (D-10): RLS `to authenticated` does NOT enforce the subscription
  // tier — the paid check is a separate app-layer rule that MUST stay here.
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const patientId = (await searchParams)?.patientId
  // IDOR guard (T-05-05): the patient row IS owner-scoped — read it via the
  // profile_id-scoped module so a foreign/guessed id resolves to null (renders
  // standalone, never leaks another doctor's patient). The three schedule reads
  // below stay GLOBAL (D-07) — that divergence does NOT apply to the owned patient.
  const patient = patientId
    ? await getPatientById(supabase, patientId, profile.id)
    : null

  const [sus, sbim, gestante] = await Promise.all([
    getVaccineScheduleWithItems(supabase, "SUS"),
    getVaccineScheduleWithItems(supabase, "SBIm"),
    getVaccineScheduleWithItems(supabase, "gestante"),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Syringe className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Calendário de vacinas
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Referência por idade — SUS/PNI e particular (SBIm) lado a lado, mais
            a vacinação da gestante. Somente consulta.
          </p>
        </div>
      </div>

      <Separator />

      {sus || sbim || gestante ? (
        <VaccineCalendarView
          sus={sus}
          sbim={sbim}
          gestante={gestante}
          birthDate={patient?.birth_date}
          gestationalAgeWeeks={patient?.gestational_age_weeks}
        />
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
              <Syringe className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">Calendário indisponível</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Os dados de referência ainda não foram carregados. Atualize a
              página ou tente novamente mais tarde.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
