import { z } from "zod"

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

export const SEX_OPTIONS = [
  { value: "Masculino", label: "Masculino" },
  { value: "Feminino", label: "Feminino" },
] as const

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
  birth_date: optionalString,
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
  sex: z
    .string()
    .transform((v) => (v?.trim() === "" ? undefined : v?.trim()))
    .refine(
      (v) => !v || ["Masculino", "Feminino"].includes(v),
      "Selecione Masculino ou Feminino"
    )
    .optional(),
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
  birth_date: optionalString,
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
  sex: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.trim() === "" || ["Masculino", "Feminino"].includes(v.trim()),
      "Selecione Masculino ou Feminino"
    ),
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

export type CreatePatientFormData = z.infer<typeof createPatientSchema>
export type UpdatePatientFormData = z.infer<typeof updatePatientSchema>
