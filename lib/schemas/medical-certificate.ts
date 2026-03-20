import { z } from "zod"

export const comparecimentoPayloadSchema = z.object({
  patientName: z.string().min(1, "Nome do paciente é obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  attendanceDate: z.string().min(1, "Data do atendimento é obrigatória"),
  timeStart: z.string().default(""),
  timeEnd: z.string().default(""),
  periodo: z
    .union([z.literal(""), z.enum(["matutino", "vespertino", "noturno", "atual_data"])])
    .default(""),
  observations: z.string().default(""),
})

export const aptidaoFisicaPayloadSchema = z.object({
  patientName: z.string().min(1, "Nome do paciente é obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  activities: z.string().min(1, "Atividades são obrigatórias"),
  validity: z.string().min(1, "Validade é obrigatória"),
  observations: z.string().default(""),
})

const todayISO = () => new Date().toISOString().slice(0, 10)

export const medicoPayloadSchema = z
  .object({
    patientName: z.string().min(1, "Nome do paciente é obrigatório"),
    birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
    daysAway: z.number().int().min(1, "Informe o número de dias"),
    startDate: z.string().min(1, "Data de início do afastamento é obrigatória"),
    cid10: z.string().default(""),
    canLeaveHome: z.boolean(),
    observations: z.string().default(""),
  })
  .refine((data) => data.startDate >= todayISO(), {
    message: "A data de início deve ser a data de hoje ou posterior.",
    path: ["startDate"],
  })

export const acompanhantePayloadSchema = z.object({
  companionName: z.string().min(1, "Nome do acompanhante é obrigatório"),
  patientName: z.string().min(1, "Nome do paciente é obrigatório"),
  consultationDate: z.string().min(1, "Data da consulta é obrigatória"),
  timeStart: z.string().default(""),
  timeEnd: z.string().default(""),
  periodo: z
    .union([z.literal(""), z.enum(["matutino", "vespertino", "noturno", "atual_data"])])
    .default(""),
  observations: z.string().default(""),
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
