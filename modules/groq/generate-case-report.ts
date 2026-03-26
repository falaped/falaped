import { env } from "@/lib/env"
import { generateCaseReport as generateCaseReportFromKit } from "@falaped/falaped-kit/groq"
import {
  splitPatientContext,
  type PatientReportContext,
} from "@/modules/groq/lib/split-patient-context"

export type ConversationMessage = {
  role: "user" | "assistant"
  content: string
}

export type TemplateSectionInput = {
  name: string
  description?: string
}

export type { PatientReportContext }

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
