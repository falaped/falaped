"use server"

import { generateStorySchema, type BookStory } from "@/lib/schemas/book"
import { createClient } from "@/lib/supabase/server"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { generateStory } from "@/modules/books/story/generate-story"
import { groqStoryCompletion } from "@/modules/books/story/groq-story-completion"
import { getBookTheme } from "@/modules/books/themes"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type GenerateStoryResult = { ok: true; story: BookStory } | { ok: false; error: string }

/**
 * Gera a história personalizada para o wizard revisar antes de criar o livro.
 * Só texto (Groq): não gera imagens nem grava nada.
 */
export async function generateStoryAction(input: unknown): Promise<GenerateStoryResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") return { ok: false, error: "Perfil não ativo." }

  const parsed = generateStorySchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  const { childName, childGender, theme, pediatricianName, details } = parsed.data

  try {
    const story = await generateStory(
      { theme: getBookTheme(theme), child: { name: childName, gender: childGender, pediatricianName }, details },
      { complete: groqStoryCompletion },
    )
    return { ok: true, story }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao gerar a história." }
  }
}
