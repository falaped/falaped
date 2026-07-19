"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createExamRequestTemplate } from "@/modules/exam-request-templates/create-exam-request-template"

const createExamRequestTemplateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do template."),
  snapshot: z.object({
    exams: z.array(z.string()).optional(),
    hypothesis: z.string().optional(),
    observations: z.string().optional(),
  }),
})

export type CreateExamRequestTemplateResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export async function createExamRequestTemplateAction(params: {
  name: string
  snapshot: {
    exams?: string[]
    hypothesis?: string
    observations?: string
  }
}): Promise<CreateExamRequestTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = createExamRequestTemplateSchema.safeParse(params)
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors?.name?.[0] ?? parsed.error.message
    return { ok: false, error: msg }
  }

  try {
    const id = await createExamRequestTemplate(supabase, {
      profileId: profile.id,
      name: parsed.data.name,
      snapshot: parsed.data.snapshot,
    })
    revalidatePath("/dashboard/exam-requests")
    return { ok: true, id }
  } catch (e) {
    console.error("[EXAM_REQUEST_TEMPLATES] create failed", e)
    return { ok: false, error: "Erro ao salvar template. Tente novamente." }
  }
}
