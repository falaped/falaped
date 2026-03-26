import { groq } from "@/modules/groq/groq-client"
import { looksLikeCaptionHallucination } from "@/modules/groq/lib/caption-hallucination"

const TRANSCRIPTION_MODEL = "whisper-large-v3"

/**
 * Whisper `prompt`: short domain vocabulary only (not a chat system message).
 * Do not use words like "Transcrição" or "Legendas" — borderline audio can trigger
 * YouTube-style caption hallucinations when those tokens appear in the prompt.
 */
const WHISPER_DOMAIN_TERMS = [
  "peso",
  "altura",
  "comprimento",
  "perímetro cefálico",
  "febre",
  "vacinas",
  "exame físico",
  "responsável",
  "aleitamento",
] as const

const DOMAIN_VOCABULARY_HINT = `${WHISPER_DOMAIN_TERMS.join(", ")}.`

/** Thrown when the model output matches known caption-style hallucination patterns. */
export const TRANSCRIPTION_REJECTED_UNUSABLE = "TRANSCRIPTION_REJECTED_UNUSABLE"

export async function transcribeAudioFile(file: File): Promise<string> {
  const transcription = await groq.audio.transcriptions.create({
    file,
    model: TRANSCRIPTION_MODEL,
    language: "pt",
    prompt: DOMAIN_VOCABULARY_HINT,
    temperature: 0,
    response_format: "json",
  })

  const text = (transcription.text ?? "").trim()
  if (looksLikeCaptionHallucination(text)) {
    throw new Error(TRANSCRIPTION_REJECTED_UNUSABLE)
  }
  return text
}
