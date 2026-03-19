import { env } from "@/lib/env"
import { generateCaseReport as generateCaseReportFromKit } from "@falaped/falaped-kit/groq"
import type {
  PatientClinicalContext,
  PatientIdentityContext,
} from "@falaped/falaped-kit"

export type ConversationMessage = {
  role: "user" | "assistant"
  content: string
}

export type TemplateSectionInput = {
  name: string
  description?: string
}

/** Combined patient context for callers; split into identity + clinical for the kit. */
export type PatientReportContext = PatientIdentityContext & PatientClinicalContext

function splitPatientContext(
  ctx: PatientReportContext | null,
): {
  identity: PatientIdentityContext | null
  clinical: PatientClinicalContext | null
} {
  if (!ctx) return { identity: null, clinical: null }
  return {
    identity: {
      name: ctx.name,
      birth_date: ctx.birth_date,
      responsible: ctx.responsible,
      contact_phone: ctx.contact_phone,
    },
    clinical: {
      sex: ctx.sex,
      legal_guardian: ctx.legal_guardian,
      blood_type: ctx.blood_type,
      weight: ctx.weight,
      height: ctx.height,
      head_circumference: ctx.head_circumference,
      allergies: ctx.allergies,
      current_medications: ctx.current_medications,
      medical_history: ctx.medical_history,
    },
  }
}

/**
 * Generates report content per section from a case conversation using Groq via falaped-kit.
 * Delegates to `@falaped/falaped-kit/groq` `generateCaseReport` (identity vs clinical context).
 */
export async function generateCaseReport(
  messages: ConversationMessage[],
  sections: TemplateSectionInput[],
  patientContext: PatientReportContext | null = null,
): Promise<Record<string, string>> {
  const apiKey = env.GROQ_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured")
  }

  const { identity, clinical } = splitPatientContext(patientContext)

  return generateCaseReportFromKit(messages, sections, identity, clinical, {
    apiKey,
  })
}
