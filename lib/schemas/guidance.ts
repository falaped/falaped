import { z } from "zod"

/** Item da biblioteca de orientações (criar/editar um marco). */
export const guidanceTemplateSchema = z.object({
  milestone: z.string().min(1, "Informe o marco"),
  body: z.string().min(1, "Informe o texto da orientação"),
  sortOrder: z.number().int().optional(),
})

/** Payload do documento de orientação gerado (auto-fill do paciente + marco/texto). */
export const guidanceDocumentPayloadSchema = z.object({
  patientName: z.string().optional(),
  birthDate: z.string().optional(),
  milestone: z.string().min(1, "Selecione um marco"),
  body: z.string().min(1, "Informe o texto da orientação"),
})

export const generateGuidanceSchema = z.object({
  payload: guidanceDocumentPayloadSchema,
  locationState: z.string().optional(),
  issuedAt: z.string().optional(),
})

export type GuidanceTemplateInput = z.infer<typeof guidanceTemplateSchema>
export type GuidanceDocumentPayloadInput = z.infer<
  typeof guidanceDocumentPayloadSchema
>
export type GenerateGuidanceInput = z.infer<typeof generateGuidanceSchema>
