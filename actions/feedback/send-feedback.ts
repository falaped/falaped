"use server"

import { revalidatePath } from "next/cache"

import { sendFeedbackSchema, type SendFeedbackInput } from "@/lib/feedback"
import { createClient } from "@/lib/supabase/server"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { createFeedback } from "@/modules/feedback/create-feedback"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type SendFeedbackResult = { ok: true } | { ok: false; error: string }

/** "Enviar feedback" do menu: sugestão, problema ou elogio, com a tela de origem. */
export async function sendFeedbackAction(input: SendFeedbackInput): Promise<SendFeedbackResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  const parsed = sendFeedbackSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }

  try {
    await createFeedback(supabase, {
      profileId: profile.id,
      kind: parsed.data.kind,
      message: parsed.data.message,
      page: parsed.data.page ?? null,
    })
    revalidatePath("/dashboard/admin/feedback")
    return { ok: true }
  } catch (error: unknown) {
    console.error("[FEEDBACK] send failed", error)
    return { ok: false, error: "Não foi possível enviar. Tente de novo." }
  }
}
