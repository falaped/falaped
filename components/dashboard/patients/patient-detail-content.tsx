import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { getPatientPhotoSignedUrl } from "@/modules/patients/get-patient-photo-signed-url"
import { getCasesByPatientId } from "@/modules/cases/get-cases-by-patient-id"
import { getMedicalCertificatesByPatientId } from "@/modules/medical-certificates/get-medical-certificates-by-patient-id"
import { getPrescriptionsByPatientId } from "@/modules/prescriptions/get-prescriptions-by-patient-id"
import { getMeasurementsByPatient } from "@/modules/patient-growth/get-measurements-by-patient"
import { getScaleResultsByPatient } from "@/modules/patient-scales/get-scale-results-by-patient"
import { listAttachmentsByPatient } from "@/modules/patient-attachments/list-attachments-by-patient"
import { getPhoneByProfileId } from "@/modules/authenticated-users/get-phone-by-profile-id"
import { getPreviousCaseCarryover } from "@/modules/cases/get-previous-case-carryover"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { getVaccineScheduleWithItems } from "@/modules/vaccines/get-vaccine-schedule-with-items"
import { getTakenDoseIdsByPatient } from "@/modules/patient-vaccine-doses/get-taken-dose-ids-by-patient"
import type { VaccineScheduleWithItems } from "@/modules/vaccines/types"
import { PatientDetailView } from "./patient-detail-view"

export async function PatientDetailContent({ id }: { id: string }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const patient = await getPatientById(supabase, id, profile.id)
  if (!patient) notFound()

  // Reference vaccine calendars (D-07: GLOBAL reference data — no owner filter).
  // Degrade gracefully (WR-01): a read error MUST NOT crash the ficha, so the
  // vaccine reads are isolated in a try/catch that resolves to null. The card
  // renders nothing / an empty state when the data is unavailable.
  const [
    cases,
    certificates,
    prescriptions,
    photoUrl,
    measurements,
    vaccines,
    takenVaccineItemIds,
    scaleResults,
    attachments,
  ] = await Promise.all([
    getCasesByPatientId(supabase, profile.id, patient.id),
    getMedicalCertificatesByPatientId(supabase, profile.id, patient.id),
    getPrescriptionsByPatientId(supabase, profile.id, patient.id),
    getPatientPhotoSignedUrl(supabase, patient.photo_path),
    getMeasurementsByPatient(supabase, profile.id, patient.id),
    getVaccineSchedulesSafely(supabase),
    getTakenVaccineDoseIdsSafely(supabase, profile.id, patient.id),
    getScaleResultsByPatient(supabase, profile.id, patient.id),
    listAttachmentsByPatient(supabase, profile.id, patient.id),
  ])

  // Idade em meses inteiros derivada aqui (servidor) e descida como prop: é o
  // filtro de quais escalas fazem sentido para esta criança.
  const ageMonths =
    computePediatricAge(patient.birth_date, new Date()).totalMonths ?? null

  // Resumo e lembretes da última consulta. Falha vira null: a ficha inteira não
  // pode cair porque o resumo não carregou.
  const phone = await getPhoneByProfileId(supabase, profile.id).catch(() => null)
  const lastCarryover = phone
    ? await getPreviousCaseCarryover(supabase, profile.id, phone, patient.id).catch(() => null)
    : null

  return (
    <PatientDetailView
      key={patient.id}
      patient={patient}
      cases={cases}
      certificates={certificates}
      prescriptions={prescriptions}
      photoUrl={photoUrl}
      measurements={measurements}
      vaccineSus={vaccines.sus}
      vaccineSbim={vaccines.sbim}
      takenVaccineItemIds={takenVaccineItemIds}
      scaleResults={scaleResults}
      ageMonths={ageMonths}
      attachments={attachments}
      lastCarryover={lastCarryover}
    />
  )
}

/**
 * Reads the patient's applied-dose marks for the vaccine calendar carousel,
 * degrading to an empty list on any read error so a dose-read fault never
 * crashes the ficha (WR-01). Scoped by profile_id + patient_id in the module.
 */
async function getTakenVaccineDoseIdsSafely(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  patientId: string,
): Promise<string[]> {
  try {
    const ids = await getTakenDoseIdsByPatient(supabase, profileId, patientId)
    return [...ids]
  } catch {
    return []
  }
}

/**
 * Reads the SUS + SBIm reference calendars for the in-profile vaccine card,
 * degrading to null on any read error so the patient ficha never crashes on a
 * vaccine reference fault (WR-01). Global reference data (D-07) — no owner scope.
 */
async function getVaccineSchedulesSafely(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{
  sus: VaccineScheduleWithItems | null
  sbim: VaccineScheduleWithItems | null
}> {
  try {
    const [sus, sbim] = await Promise.all([
      getVaccineScheduleWithItems(supabase, "SUS"),
      getVaccineScheduleWithItems(supabase, "SBIm"),
    ])
    return { sus, sbim }
  } catch {
    return { sus: null, sbim: null }
  }
}
