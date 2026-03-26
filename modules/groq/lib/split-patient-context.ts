import type {
  PatientClinicalContext,
  PatientIdentityContext,
} from "@falaped/falaped-kit"

export type PatientReportContext = PatientIdentityContext & PatientClinicalContext

export function splitPatientContext(
  ctx: PatientReportContext | null,
): {
  identity: PatientIdentityContext | null
  clinical: PatientClinicalContext | null
} {
  if (!ctx) return { identity: null, clinical: null }
  return {
    identity: {
      name: ctx.name,
      birth_date: ctx.birth_date,
      responsible: ctx.responsible,
      contact_phone: ctx.contact_phone,
    },
    clinical: {
      sex: ctx.sex,
      legal_guardian: ctx.legal_guardian,
      blood_type: ctx.blood_type,
      weight: ctx.weight,
      height: ctx.height,
      head_circumference: ctx.head_circumference,
      allergies: ctx.allergies,
      current_medications: ctx.current_medications,
      medical_history: ctx.medical_history,
    },
  }
}
