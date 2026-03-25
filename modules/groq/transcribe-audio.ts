import { groq } from "@/modules/groq/groq-client"

const MODEL = "whisper-large-v3"

/**
 * Short vocabulary hint for domain terms only. Do not start with "Transcrição" or similar —
 * Whisper often hallucinates YouTube-style captions ("Transcrição e Legendas…") when the prompt
 * contains those words and audio is borderline.
 */
const DOMAIN_VOCABULARY_HINT =
  "peso, altura, comprimento, perímetro cefálico, febre, vacinas, exame físico, responsável, aleitamento."

/** Thrown when the model output matches known caption-style hallucination patterns. */
export const TRANSCRIPTION_REJECTED_UNUSABLE = "TRANSCRIPTION_REJECTED_UNUSABLE"

function looksLikeCaptionHallucination(text: string): boolean {
  const n = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  if (/transcri(c|ç)ao\s+e\s+legendas/.test(n)) return true
  if (/\blegendas\b/.test(n) && /\btranscri(c|ç)ao\b/.test(n) && text.length < 160) return true
  if (/\bamara\.org\b/.test(n) || /\bsubs\s*titulos\b/.test(n)) return true
  return false
}

export async function transcribeAudioFile(file: File): Promise<string> {
  const transcription = await groq.audio.transcriptions.create({
    file,
    model: MODEL,
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

