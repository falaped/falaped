import { z } from "zod"

export const examRequestPayloadSchema = z.object({
  patientName: z.string().optional(),
  birthDate: z.string().optional(),
  // Armazenar STRINGS RESOLVIDAS dos exames — nunca ids de catálogo (Pitfall 5).
  exams: z
    .array(z.string().min(1))
    .min(1, "Adicione pelo menos um exame ao pedido."),
  hypothesis: z.string().optional(),
  observations: z.string().optional(),
})

export const generateExamRequestSchema = z.object({
  payload: examRequestPayloadSchema,
  locationState: z.string().optional(),
  issuedAt: z.string().optional(),
})

export type ExamRequestPayloadInput = z.infer<typeof examRequestPayloadSchema>
export type GenerateExamRequestInput = z.infer<typeof generateExamRequestSchema>
