import { z } from "zod"
import { prescriptionMedicationSchema } from "./prescription"

export const prescriptionTemplateSnapshotSchema = z.object({
  medications: z
    .array(prescriptionMedicationSchema)
    .min(1, "Adicione pelo menos um medicamento"),
  orientations: z.string().optional(),
  warningSigns: z.string().optional(),
  additionalNotes: z.string().optional(),
  locationState: z.string().optional(),
})

export const createPrescriptionTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Nome do template é obrigatório")
    .max(200, "Use no máximo 200 caracteres"),
  snapshot: prescriptionTemplateSnapshotSchema,
})

export type CreatePrescriptionTemplateInput = z.infer<
  typeof createPrescriptionTemplateSchema
>
export type PrescriptionTemplateSnapshotInput = z.infer<
  typeof prescriptionTemplateSnapshotSchema
>
