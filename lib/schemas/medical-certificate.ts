import { z } from "zod"

export const comparecimentoPayloadSchema = z.object({
  patientName: z.string().min(1, "Nome do paciente é obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  attendanceDate: z.string().min(1, "Data do atendimento é obrigatória"),
  timeStart: z.string().min(1, "Hora de início é obrigatória"),
  timeEnd: z.string().min(1, "Hora de fim é obrigatória"),
  observations: z.string().default(""),
})

export const aptidaoFisicaPayloadSchema = z.object({
  patientName: z.string().min(1, "Nome do paciente é obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  activities: z.string().min(1, "Atividades são obrigatórias"),
  validityDate: z.string().min(1, "Data de validade é obrigatória"),
  observations: z.string().default(""),
})

export const medicoPayloadSchema = z.object({
  patientName: z.string().min(1, "Nome do paciente é obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  daysAway: z.number().int().min(1, "Informe o número de dias"),
  startDate: z.string().min(1, "Data de início do afastamento é obrigatória"),
  cid10: z.string().min(1, "CID-10 é obrigatório"),
  canLeaveHome: z.boolean(),
  observations: z.string().default(""),
})

export const acompanhantePayloadSchema = z.object({
  companionName: z.string().min(1, "Nome do acompanhante é obrigatório"),
  patientName: z.string().min(1, "Nome do paciente é obrigatório"),
  consultationDate: z.string().min(1, "Data da consulta é obrigatória"),
  timeStart: z.string().min(1, "Hora de início é obrigatória"),
  timeEnd: z.string().min(1, "Hora de fim é obrigatória"),
})

export const medicalCertificateTypeSchema = z.enum([
  "comparecimento",
  "aptidao_fisica",
  "medico",
  "acompanhante",
])

export const generateMedicalCertificateSchema = z.object({
  type: medicalCertificateTypeSchema,
  payload: z.unknown(),
  locationState: z.string().optional(),
  issuedAt: z.string().optional(),
})

export type GenerateMedicalCertificateInput = z.infer<typeof generateMedicalCertificateSchema>
