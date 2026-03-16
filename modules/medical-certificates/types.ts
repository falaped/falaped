/**
 * Types for medical certificate payloads and doctor info.
 */

export type MedicalCertificateType =
  | "comparecimento"
  | "aptidao_fisica"
  | "medico"
  | "acompanhante"

export type DoctorInfo = {
  firstName: string
  surname: string
  crm: string | null
}

export type ComparecimentoPayload = {
  patientName: string
  birthDate: string
  attendanceDate: string
  timeStart: string
  timeEnd: string
  observations: string
}

export type AptidaoFisicaPayload = {
  patientName: string
  birthDate: string
  activities: string
  validityDate: string
  observations: string
}

export type MedicoPayload = {
  patientName: string
  birthDate: string
  daysAway: number
  startDate: string
  cid10: string
  canLeaveHome: boolean
  observations: string
}

export type AcompanhantePayload = {
  companionName: string
  patientName: string
  consultationDate: string
  timeStart: string
  timeEnd: string
  observations?: string
}

export type MedicalCertificatePayload =
  | { type: "comparecimento"; payload: ComparecimentoPayload }
  | { type: "aptidao_fisica"; payload: AptidaoFisicaPayload }
  | { type: "medico"; payload: MedicoPayload }
  | { type: "acompanhante"; payload: AcompanhantePayload }
