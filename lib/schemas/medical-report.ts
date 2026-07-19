import { z } from "zod"

export const medicalReportPayloadSchema = z.object({
  patientName: z.string().optional(),
  birthDate: z.string().optional(),
  title: z.string().min(1, "Informe o título ou finalidade"),
  bodyHtml: z.string(),
})

export const generateMedicalReportSchema = z.object({
  payload: medicalReportPayloadSchema,
  locationState: z.string().optional(),
  issuedAt: z.string().optional(),
})

export type MedicalReportPayloadInput = z.infer<
  typeof medicalReportPayloadSchema
>
export type GenerateMedicalReportInput = z.infer<
  typeof generateMedicalReportSchema
>
