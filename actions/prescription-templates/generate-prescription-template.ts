"use server"

import { z } from "zod"

import { env } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"
import { generatePrescriptionTemplate } from "@/modules/groq/generate-prescription-template"
import type { GeneratedPrescriptionTemplate } from "@/modules/groq/lib/template-suggestion-parsers"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type GeneratePrescriptionTemplateResult = ({ ok: true } & GeneratedPrescriptionTemplate) | { ok: false; error: string }

const schema = z.string().trim().min(1, "Diga para qual quadro é a receita.").max(300, "Use no máximo 300 caracteres.")

/** Sugere um modelo de receita sem dose a partir do quadro; nada é salvo. */
export async function generatePrescriptionTemplateAction(prompt: string): Promise<GeneratePrescriptionTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
  if (!env.GROQ_API_KEY?.trim()) return { ok: false, error: "Geração por IA não está configurada." }

  const parsed = schema.safeParse(prompt)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Descrição inválida." }

  try {
    const result = await generatePrescriptionTemplate(parsed.data)
    if (!result.medications.length) {
      return { ok: false, error: "Não consegui sugerir medicamentos para esse quadro. Tente descrever de outro jeito." }
    }
    return { ok: true, ...result }
  } catch (e) {
    console.error("[PRESCRIPTION_TEMPLATES] generate failed", e)
    return { ok: false, error: "Erro ao gerar a sugestão. Tente novamente." }
  }
}
