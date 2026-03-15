import { z } from "zod"

export const prescriptionMedicationSchema = z.object({
  name: z.string().min(1, "Nome do medicamento é obrigatório"),
  dosage: z.string().optional(),
  posology: z.string().min(1, "Posologia é obrigatória"),
  duration: z.string().optional(),
  observations: z.string().optional(),
})

export const prescriptionPayloadSchema = z.object({
  patientName: z.string().optional(),
  birthDate: z.string().optional(),
  medications: z
    .array(prescriptionMedicationSchema)
    .min(1, "Adicione pelo menos um medicamento"),
})

export const generatePrescriptionSchema = z.object({
  payload: prescriptionPayloadSchema,
  locationState: z.string().min(1, "Estado é obrigatório"),
  issuedAt: z.string().optional(),
})

export type PrescriptionMedicationInput = z.infer<typeof prescriptionMedicationSchema>
export type PrescriptionPayloadInput = z.infer<typeof prescriptionPayloadSchema>
export type GeneratePrescriptionInput = z.infer<typeof generatePrescriptionSchema>
