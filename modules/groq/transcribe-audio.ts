import { groq } from "@/modules/groq/groq-client"
import { looksLikeCaptionHallucination } from "@/modules/groq/lib/caption-hallucination"

const TRANSCRIPTION_MODEL = "whisper-large-v3"

/**
 * Short vocabulary hint for domain terms only. Do not start with "Transcrição" or similar —
 * Whisper often hallucinates YouTube-style captions ("Transcrição e Legendas…") when the prompt
 * contains those words and audio is borderline.
 */
const DOMAIN_VOCABULARY_HINT =
  "peso, altura, comprimento, perímetro cefálico, febre, vacinas, exame físico, responsável, aleitamento."

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
