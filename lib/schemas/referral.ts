import { z } from "zod"

export const referralPayloadSchema = z.object({
  patientName: z.string().optional(),
  birthDate: z.string().optional(),
  specialty: z
    .string()
    .min(1, "Informe a especialidade ou serviço de destino"),
  reason: z.string().min(1, "Informe o motivo"),
  clinicalSummary: z.string().optional(),
  urgency: z.enum(["rotina", "prioritario", "urgente"]).default("rotina"),
})

export const generateReferralSchema = z.object({
  payload: referralPayloadSchema,
  locationState: z.string().optional(),
  issuedAt: z.string().optional(),
})

export type ReferralPayloadInput = z.infer<typeof referralPayloadSchema>
export type GenerateReferralInput = z.infer<typeof generateReferralSchema>
