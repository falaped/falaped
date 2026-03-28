import { z } from "zod"

import {
  isCompleteBirthDateInputString,
  parseBirthDateFormValueToIso,
} from "@/lib/brazilian-date-form"
import { PATIENT_SEX_VALUES } from "@/modules/patients/patient-sex"

const GENERIC_TERMS = [
  "mãe",
  "pai",
  "responsável",
  "avó",
  "avô",
  "tio",
  "tia",
]

const optionalString = z
  .string()
  .transform((v) => (v?.trim() === "" ? undefined : v?.trim()))
  .optional()

/** Form: dd/mm/aaaa; after client resolver also yyyy-mm-dd; output yyyy-mm-dd for Supabase `date`. */
const optionalBrazilianBirthDate = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === "" || isCompleteBirthDateInputString(v), {
    message: "Informe a data completa (dd/mm/aaaa).",
  })
  .refine((v) => v === "" || parseBirthDateFormValueToIso(v) !== null, {
    message: "Use uma data válida no formato dd/mm/aaaa.",
  })
  .transform((v) => {
    if (v === "") return undefined
    return parseBirthDateFormValueToIso(v)!
  })

/** Empty string or enum keys `masculino` / `feminino`; DB write normalizes via `normalizePatientSexFromDb`. */
const patientSexFormField = z.string().refine(
  (v) =>
    v.trim() === "" ||
    (PATIENT_SEX_VALUES as readonly string[]).includes(v.trim()),
  "Selecione Masculino ou Feminino",
)

export const BLOOD_TYPE_OPTIONS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const

export const createPatientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  birth_date: optionalBrazilianBirthDate,
  responsible: z
    .string()
    .min(3, "Informe o nome completo do responsável")
    .refine(
      (val) => !GENERIC_TERMS.includes(val.toLowerCase().trim()),
      "Use o nome completo (ex.: Maria Silva), não \"mãe\" ou \"pai\""
    ),
  contact_phone: z
    .string()
    .min(1, "Telefone de contato é obrigatório")
    .refine(
      (val) => val.replace(/\D/g, "").length >= 10,
      "Informe um telefone válido com pelo menos 10 dígitos"
    ),
  sex: patientSexFormField,
  legal_guardian: optionalString,
  blood_type: z
    .string()
    .transform((v) => (v?.trim() === "" ? undefined : v?.trim()))
    .refine(
      (v) => !v || BLOOD_TYPE_OPTIONS.includes(v as (typeof BLOOD_TYPE_OPTIONS)[number]),
      "Selecione um tipo sanguíneo válido"
    )
    .optional(),
  weight: optionalString,
  height: optionalString,
  head_circumference: optionalString,
  allergies: optionalString,
  current_medications: optionalString,
  medical_history: optionalString,
})

export const updatePatientSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .optional(),
  birth_date: optionalBrazilianBirthDate,
  responsible: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        val.trim() === "" ||
        (val.trim().length >= 3 &&
          !GENERIC_TERMS.includes(val.toLowerCase().trim())),
      "Use o nome completo (ex.: Maria Silva), não \"mãe\" ou \"pai\""
    ),
  contact_phone: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val || val.trim() === "" || val.replace(/\D/g, "").length >= 10,
      "Informe um telefone válido com pelo menos 10 dígitos"
    ),
  sex: patientSexFormField,
  legal_guardian: optionalString,
  blood_type: z
    .string()
    .optional()
    .refine(
      (v) =>
        !v ||
        v.trim() === "" ||
        BLOOD_TYPE_OPTIONS.includes(v.trim() as (typeof BLOOD_TYPE_OPTIONS)[number]),
      "Selecione um tipo sanguíneo válido"
    ),
  weight: optionalString,
  height: optionalString,
  head_circumference: optionalString,
  allergies: optionalString,
  current_medications: optionalString,
  medical_history: optionalString,
})

/** Values after Zod parse (e.g. birth_date as yyyy-mm-dd). */
export type CreatePatientFormData = z.output<typeof createPatientSchema>
export type UpdatePatientFormData = z.output<typeof updatePatientSchema>

/** Raw form state (e.g. birth_date as dd/mm/aaaa string). */
export type CreatePatientFormInput = z.input<typeof createPatientSchema>
export type UpdatePatientFormInput = z.input<typeof updatePatientSchema>
