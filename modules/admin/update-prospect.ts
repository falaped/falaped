import type { SupabaseClient } from "@supabase/supabase-js"

import { STAGE_LABEL } from "@/lib/funnel"
import { attachProfiles, type ProspectRow, type ProspectStatus } from "@/modules/admin/list-prospects"

export type ProspectPatch = Partial<
  Pick<ProspectRow, "title" | "name" | "full_name" | "city" | "email" | "phone" | "crm" | "clinic" | "next_contact_at" | "lost_reason"> & {
    status: ProspectStatus
  }
>

/**
 * Salva os campos editáveis de um prospect e devolve a linha atualizada. Mudança de etapa
 * entra na linha do tempo; "respondeu" grava quando (temperatura quente) e sair de
 * "perdido" limpa o motivo.
 */
export async function updateProspect(
  supabase: SupabaseClient,
  id: string,
  patch: ProspectPatch,
): Promise<ProspectRow> {
  const { data: current, error: currentError } = await supabase
    .from("prospects")
    .select("status")
    .eq("id", id)
    .maybeSingle()
  if (currentError) throw new Error(`[ADMIN] Failed to load prospect: ${currentError.message}`)
  if (!current) throw new Error("[ADMIN] Prospect não encontrado.")

  const now = new Date().toISOString()
  const stageChanged = patch.status !== undefined && patch.status !== current.status
  const update = {
    ...patch,
    ...(stageChanged && patch.status === "respondeu" && { replied_at: now }),
    ...(stageChanged && patch.status !== "perdido" && { lost_reason: null }),
    // Perdido sai da fila de follow-up.
    ...(stageChanged && patch.status === "perdido" && { next_contact_at: null }),
    updated_at: now,
  }

  const { data, error } = await supabase.from("prospects").update(update).eq("id", id).select("*").maybeSingle()
  if (error) throw new Error(`[ADMIN] Failed to update prospect: ${error.message}`)
  if (!data) throw new Error("[ADMIN] Prospect não encontrado.")

  if (stageChanged) {
    const label = STAGE_LABEL[patch.status!]
    const detail = patch.status === "perdido" && patch.lost_reason ? `${label}: ${patch.lost_reason}` : label
    const { error: eventError } = await supabase.from("prospect_events").insert({ prospect_id: id, kind: "etapa", detail })
    if (eventError) throw new Error(`[ADMIN] Etapa salva, mas falhou ao registrar: ${eventError.message}`)
  }

  const [row] = await attachProfiles(supabase, [data as Omit<ProspectRow, "profile">])
  return row!
}
