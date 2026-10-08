"use server"

import { z } from "zod"

import { env } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"
import { getExamCatalogItems } from "@/modules/exam-catalog/get-exam-catalog-items"
import { generateExamPanel } from "@/modules/groq/generate-exam-panel"
import type { GeneratedExamPanel } from "@/modules/groq/lib/template-suggestion-parsers"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type GenerateExamPanelResult = ({ ok: true } & GeneratedExamPanel) | { ok: false; error: string }

const schema = z.string().trim().min(1, "Diga para que são os exames.").max(300, "Use no máximo 300 caracteres.")

/** Sugere um painel de exames para o objetivo; nada é salvo. */
export async function generateExamPanelAction(prompt: string): Promise<GenerateExamPanelResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
  if (!env.GROQ_API_KEY?.trim()) return { ok: false, error: "Geração por IA não está configurada." }

  const parsed = schema.safeParse(prompt)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Descrição inválida." }

  try {
    const catalog = (await getExamCatalogItems(supabase, profile.id)).map((item) => item.name)
    const result = await generateExamPanel(parsed.data, catalog)
    if (!result.exams.length) {
      return { ok: false, error: "Não consegui sugerir exames para isso. Tente descrever de outro jeito." }
    }
    return { ok: true, ...result }
  } catch (e) {
    console.error("[EXAM_PANELS] generate failed", e)
    return { ok: false, error: "Erro ao gerar a sugestão. Tente novamente." }
  }
}
