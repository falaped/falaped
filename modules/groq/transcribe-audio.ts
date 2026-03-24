import { groq } from "@/modules/groq/groq-client"

const MODEL = "whisper-large-v3"

export async function transcribeAudioFile(file: File): Promise<string> {
  const transcription = await groq.audio.transcriptions.create({
    file,
    model: MODEL,
    language: "pt",
    prompt:
      "Transcrição de consulta pediátrica em português brasileiro. Transcrever fielmente com termos clínicos.",
    temperature: 0,
    response_format: "verbose_json",
  })

  const text = "text" in transcription ? transcription.text : ""
  return (text ?? "").trim()
}

