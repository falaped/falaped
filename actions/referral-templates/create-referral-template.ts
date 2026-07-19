"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createReferralTemplate } from "@/modules/referral-templates/create-referral-template"

const createReferralTemplateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do template."),
  snapshot: z.object({
    specialty: z.string().optional(),
    reason: z.string().optional(),
    clinicalSummary: z.string().optional(),
    urgency: z.enum(["rotina", "prioritario", "urgente"]).optional(),
  }),
})

export type CreateReferralTemplateResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export async function createReferralTemplateAction(params: {
  name: string
  snapshot: {
    specialty?: string
    reason?: string
    clinicalSummary?: string
    urgency?: "rotina" | "prioritario" | "urgente"
  }
}): Promise<CreateReferralTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = createReferralTemplateSchema.safeParse(params)
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors?.name?.[0] ??
      parsed.error.message
    return { ok: false, error: msg }
  }

  try {
    const id = await createReferralTemplate(supabase, {
      profileId: profile.id,
      name: parsed.data.name,
      snapshot: parsed.data.snapshot,
    })
    revalidatePath("/dashboard/referrals")
    return { ok: true, id }
  } catch (e) {
    console.error("[REFERRAL_TEMPLATES] create failed", e)
    return {
      ok: false,
      error: "Erro ao salvar template. Tente novamente.",
    }
  }
}
