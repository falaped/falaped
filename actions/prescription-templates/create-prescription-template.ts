"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createPrescriptionTemplate } from "@/modules/prescription-templates/create-prescription-template"
import { createPrescriptionTemplateSchema } from "@/lib/schemas/prescription-template"

export type CreatePrescriptionTemplateResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export async function createPrescriptionTemplateAction(params: {
  name: string
  snapshot: {
    medications: Array<{
      name: string
      dosage?: string
      posology: string
      duration?: string
      observations?: string
    }>
    orientations?: string
    warningSigns?: string
    additionalNotes?: string
    locationState?: string
  }
}): Promise<CreatePrescriptionTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }

  const parsed = createPrescriptionTemplateSchema.safeParse(params)
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors?.name?.[0] ??
      parsed.error.flatten().fieldErrors?.snapshot?.[0] ??
      parsed.error.message
    return { ok: false, error: msg }
  }

  try {
    const id = await createPrescriptionTemplate(supabase, {
      profileId: profile.id,
      name: parsed.data.name,
      snapshot: parsed.data.snapshot,
    })
    revalidatePath("/dashboard/prescription-templates")
    return { ok: true, id }
  } catch (e) {
    console.error("[PRESCRIPTION_TEMPLATES] create failed", e)
    return {
      ok: false,
      error: "Erro ao salvar template. Tente novamente.",
    }
  }
}
