import { formatDate } from "@/lib/formatters"
import {
  BLOOD_TYPE_OPTIONS,
} from "@/lib/schemas/patient"
import { normalizePatientSexFromDb } from "@/modules/patients/patient-sex"
import type { Patient } from "@/modules/patients/types"

export function toFormValue(value: string | null | undefined): string {
  return value?.trim() ?? ""
}

export function birthDateToFormValue(value: string | null | undefined): string {
  if (value == null || value.trim() === "") return ""
  return formatDate(value)
}

export function sexToFormValue(value: string | null | undefined): string {
  return normalizePatientSexFromDb(value) ?? ""
}

export function bloodTypeToFormValue(
  value: string | null | undefined,
): string {
  const v = toFormValue(value)
  return BLOOD_TYPE_OPTIONS.includes(v as (typeof BLOOD_TYPE_OPTIONS)[number])
    ? v
    : ""
}

export function buildEditPatientDefaultValues(patient: Patient) {
  return {
    name: toFormValue(patient.name),
    birth_date: birthDateToFormValue(patient.birth_date),
    responsible: toFormValue(patient.responsible),
    contact_phone: toFormValue(patient.contact_phone),
    sex: sexToFormValue(patient.sex),
    legal_guardian: toFormValue(patient.legal_guardian),
    blood_type: bloodTypeToFormValue(patient.blood_type),
    gestational_age_weeks:
      patient.gestational_age_weeks != null
        ? String(patient.gestational_age_weeks)
        : "",
    weight: toFormValue(patient.weight),
    height: toFormValue(patient.height),
    head_circumference: toFormValue(patient.head_circumference),
    allergies: toFormValue(patient.allergies),
    current_medications: toFormValue(patient.current_medications),
    medical_history: toFormValue(patient.medical_history),
  }
}

export const CREATE_PATIENT_DEFAULT_VALUES = {
  name: "",
  birth_date: "",
  responsible: "",
  contact_phone: "",
  sex: "",
  legal_guardian: "",
  blood_type: "",
  gestational_age_weeks: "",
  weight: "",
  height: "",
  head_circumference: "",
  allergies: "",
  current_medications: "",
  medical_history: "",
} as const
