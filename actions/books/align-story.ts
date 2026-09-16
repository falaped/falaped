"use server"

import { alignStorySchema, type BookStory } from "@/lib/schemas/book"
import { createClient } from "@/lib/supabase/server"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { alignScenes } from "@/modules/books/story/align-scenes"
import { groqStoryCompletion } from "@/modules/books/story/groq-story-completion"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type AlignStoryResult = { ok: true; story: BookStory; aligned: number[] } | { ok: false; error: string }

/**
 * Depois da revisão dos textos, reescreve (Groq) as cenas das páginas editadas
 * para o desenho acompanhar o texto novo. Só texto: não gera imagens nem grava.
 */
export async function alignStoryAction(input: unknown): Promise<AlignStoryResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") return { ok: false, error: "Perfil não ativo." }

  const parsed = alignStorySchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }

  try {
    const result = await alignScenes(parsed.data, { complete: groqStoryCompletion })
    return { ok: true, ...result }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao ajustar as cenas." }
  }
}
