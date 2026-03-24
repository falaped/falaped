"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createDashboardCaseWithPatient } from "@/modules/cases/create-dashboard-case-with-patient"
import { insertCaseMessage } from "@/modules/case-messages/insert-case-message"
import { DASHBOARD_NEW_CASE_GREETING } from "@/lib/constants"

export type CreateDashboardCaseWithPatientActionResult =
  | { ok: true; caseId: string }
  | { ok: false; code: "not_authenticated" | "unpaid" | "no_phone" | "whatsapp_active" | "unknown"; error: string; activeCaseId?: string }

function getGreetingByTime(): "Bom dia" | "Boa tarde" | "Boa noite" {
  const hourInBrazil = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  )

  if (hourInBrazil >= 6 && hourInBrazil < 12) return "Bom dia"
  if (hourInBrazil >= 12 && hourInBrazil < 18) return "Boa tarde"
  return "Boa noite"
}

function buildDashboardNewCaseGreeting(firstName: string | null | undefined): string {
  const greeting = getGreetingByTime()
  const safeFirstName = firstName?.trim()
  if (!safeFirstName) return DASHBOARD_NEW_CASE_GREETING

  return `${greeting} Pediatra ${safeFirstName}, vou te acompanhar neste atendimento. Pode me enviar os achados clínicos que eu organizo tudo por aqui.`
}

export async function createDashboardCaseWithPatientAction(
  patientId: string,
): Promise<CreateDashboardCaseWithPatientActionResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)

  if (!profile?.id) {
    return { ok: false, code: "not_authenticated", error: "Sessão não encontrada." }
  }

  if (profile.status !== "paid") {
    return {
      ok: false,
      code: "unpaid",
      error: "Perfil não ativo. Conecte seu WhatsApp para abrir um novo caso.",
    }
  }

  if (!profile.phone?.trim()) {
    return {
      ok: false,
      code: "no_phone",
      error: "Telefone profissional não encontrado no perfil.",
    }
  }

  try {
    const result = await createDashboardCaseWithPatient(
      supabase,
      profile.id,
      profile.phone,
      patientId,
    )

    if (result.type === "whatsapp_active") {
      return {
        ok: false,
        code: "whatsapp_active",
        error: "Existe um caso ativo do WhatsApp. Abra esse caso para continuar.",
        activeCaseId: result.activeCaseId,
      }
    }

    await insertCaseMessage(supabase, {
      caseId: result.caseId,
      role: "assistant",
      content: buildDashboardNewCaseGreeting(profile.first_name),
    })

    revalidatePath("/dashboard/cases")
    revalidatePath(`/dashboard/cases/new/${result.caseId}`)

    return { ok: true, caseId: result.caseId }
  } catch (error) {
    return {
      ok: false,
      code: "unknown",
      error: error instanceof Error ? error.message : "Erro ao abrir novo caso.",
    }
  }
}

