export type DashboardAssistantIntent =
  | "CHAT"
  | "QUESTION"
  | "SUMMARY"
  | "CALCULATE_BMI"
  | "REVIEW_PATIENT_PROFILE_UPDATE"
  | "REVIEW_ANTHROPOMETRIC_REFERENCE"
  | "REVIEW_GUARDIAN_ALERT"
  | "SUGGEST_GUARDIAN_QUESTIONS"
  | "GENERATE_REPORT"
  | "GENERATE_MEDICAL_CERTIFICATE"
  | "GENERATE_PRESCRIPTION"
  | "CLOSE_CASE"

export type AssistantAction =
  | "none"
  | "confirm_close_case"
  | "confirm_generate_report"
  | "confirm_generate_medical_certificate"
  | "confirm_generate_prescription"
  | "confirm_update_patient_profile"
  | "decline_update_patient_profile"
  | "confirm_anthropometric_reference"
  | "keep_previous_anthropometric_reference"
  | "confirm_guardian_alert_storage"
  | "decline_guardian_alert_storage"

export type StoredDataItem = {
  section:
    | "CONDUTA"
    | "DADOS_ANTROPOMETRICOS"
    | "ALERTAS_CLINICOS"
    | "CALCULO_IMC"
  label: string
  value: string
  status: "confirmado" | "pendente_de_confirmacao"
}

export type PatientProfileSnapshot = {
  id: string
  name: string | null
  birth_date: string | null
  responsible: string | null
  contact_phone: string | null
  sex: string | null
  legal_guardian: string | null
  blood_type: string | null
  weight: string | null
  height: string | null
  head_circumference: string | null
  allergies: string | null
  current_medications: string | null
  medical_history: string | null
}

export type PatientProfileUpdatePayload = {
  name?: string
  birth_date?: string | null
  responsible?: string | null
  contact_phone?: string | null
  sex?: string | null
  legal_guardian?: string | null
  blood_type?: string | null
  weight?: string | null
  height?: string | null
  head_circumference?: string | null
  allergies?: string | null
  current_medications?: string | null
  medical_history?: string | null
}
