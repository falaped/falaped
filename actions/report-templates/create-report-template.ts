"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createReportTemplate } from "@/modules/report-templates/create-report-template"
import { createReportTemplateSchema } from "@/lib/schemas/report-template"

export type CreateReportTemplateResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export async function createReportTemplateAction(
  data: z.infer<typeof createReportTemplateSchema>,
): Promise<CreateReportTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }

  const parsed = createReportTemplateSchema.safeParse(data)
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error)
    const msg = Object.values(fieldErrors).flat().find(Boolean)
    return { ok: false, error: msg ?? "Dados inválidos." }
  }

  try {
    const id = await createReportTemplate(supabase, profile.id, {
      name: parsed.data.name,
      sections: parsed.data.sections,
    })
    revalidatePath("/dashboard/report-templates")
    revalidatePath("/dashboard/profile")
    return { ok: true, id }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao criar template. Tente novamente."
    return { ok: false, error: message }
  }
}
