"use server"

import { createClient } from "@/lib/supabase/server"
import { GROQ_TRANSCRIPTION_MAX_FILE_BYTES } from "@/lib/constants"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { transcribeAudioFile } from "@/modules/groq/transcribe-audio"

export type TranscribeNewCaseAudioActionResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export async function transcribeNewCaseAudioAction(
  audio: File,
): Promise<TranscribeNewCaseAudioActionResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") {
    return { ok: false, error: "Perfil não ativo. Conecte seu WhatsApp para continuar." }
  }

  if (!audio || audio.size === 0) {
    return { ok: false, error: "Arquivo de áudio inválido." }
  }
  if (audio.size > GROQ_TRANSCRIPTION_MAX_FILE_BYTES) {
    return { ok: false, error: "Áudio acima do limite de 25MB." }
  }

  const acceptedMimeTypes = ["audio/webm", "audio/mp3", "audio/mpeg", "audio/wav", "audio/mp4"]
  if (!acceptedMimeTypes.includes(audio.type)) {
    return { ok: false, error: "Formato de áudio não suportado." }
  }

  try {
    const text = await transcribeAudioFile(audio)
    if (!text) {
      return { ok: false, error: "Não foi possível extrair texto do áudio. Tente novamente." }
    }
    return { ok: true, text }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro na transcrição."
    if (message.includes("429")) {
      return {
        ok: false,
        error: "Serviço de transcrição ocupado no momento. Tente novamente em instantes.",
      }
    }
    return { ok: false, error: "Falha ao transcrever áudio. Tente novamente." }
  }
}

