import type { SupabaseClient } from "@supabase/supabase-js"

import { clinicDay, type ConsultRecords } from "@/lib/consult-records"
import type { Measurement } from "@/modules/patient-growth/types"
import { listExamReadingsByCase } from "@/modules/exam-readings/list-exam-readings-by-case"
import { getExamRequestsByCaseId } from "@/modules/exam-requests/get-exam-requests-by-case-id"
import { getMedicalCertificatesByCaseId } from "@/modules/medical-certificates/get-medical-certificates-by-case-id"
import { listAttachmentsByCase } from "@/modules/patient-attachments/list-attachments-by-case"
import { getMeasurementsByPatient } from "@/modules/patient-growth/get-measurements-by-patient"
import { getScaleResultsByCase } from "@/modules/patient-scales/get-scale-results-by-case"
import { getPrescriptionsByCaseId } from "@/modules/prescriptions/get-prescriptions-by-case-id"
import { getReferralsByCaseId } from "@/modules/referrals/get-referrals-by-case-id"

/**
 * Tudo o que a consulta produziu (o mesmo do painel "Nesta consulta"), para dar contexto à IA.
 * Cada fonte que falhar vira lista vazia: contexto parcial é melhor que a IA sem resposta.
 * As medidas são as do dia da consulta, porque a medida é ligada à data, não ao caso;
 * `patientMeasurements` traz o histórico inteiro.
 */
export async function getConsultRecords(
  supabase: SupabaseClient,
  profileId: string,
  consult: { id: string; started_at: string; patient_id: string | null },
): Promise<ConsultRecords & { patientMeasurements: Measurement[] }> {
  const caseId = consult.id
  const [prescriptions, certificates, examRequests, referrals, scaleResults, examReadings, attachments, measurements] = await Promise.all([
    getPrescriptionsByCaseId(supabase, profileId, caseId).catch(() => []),
    getMedicalCertificatesByCaseId(supabase, profileId, caseId).catch(() => []),
    getExamRequestsByCaseId(supabase, profileId, caseId).catch(() => []),
    getReferralsByCaseId(supabase, profileId, caseId).catch(() => []),
    getScaleResultsByCase(supabase, profileId, caseId).catch(() => []),
    listExamReadingsByCase(supabase, profileId, caseId).catch(() => []),
    listAttachmentsByCase(supabase, profileId, caseId).catch(() => []),
    consult.patient_id ? getMeasurementsByPatient(supabase, profileId, consult.patient_id).catch(() => []) : [],
  ])
  const day = clinicDay(consult.started_at)
  return {
    documents: { prescriptions, certificates, examRequests, referrals },
    measurements: measurements.filter((m) => m.measured_on === day),
    measurementHistory: measurements,
    scaleResults,
    examReadings,
    attachments,
    /** Histórico inteiro, para o peso e a altura mais recentes. */
    patientMeasurements: measurements,
  }
}
