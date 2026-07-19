"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createMedicalReportTemplate } from "@/modules/medical-report-templates/create-medical-report-template"

const createMedicalReportTemplateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do template."),
  snapshot: z.object({
    title: z.string().optional(),
    bodyHtml: z.string().optional(),
  }),
})

export type CreateMedicalReportTemplateResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export async function createMedicalReportTemplateAction(params: {
  name: string
  snapshot: {
    title?: string
    bodyHtml?: string
  }
}): Promise<CreateMedicalReportTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = createMedicalReportTemplateSchema.safeParse(params)
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors?.name?.[0] ?? parsed.error.message
    return { ok: false, error: msg }
  }

  try {
    const id = await createMedicalReportTemplate(supabase, {
      profileId: profile.id,
      name: parsed.data.name,
      snapshot: parsed.data.snapshot,
    })
    revalidatePath("/dashboard/medical-reports")
    return { ok: true, id }
  } catch (e) {
    console.error("[MEDICAL_REPORT_TEMPLATES] create failed", e)
    return {
      ok: false,
      error: "Erro ao salvar template. Tente novamente.",
    }
  }
}
