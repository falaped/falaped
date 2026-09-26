import type { SupabaseClient } from "@supabase/supabase-js"

import { attachProfiles, type ProspectRow, type ProspectStatus } from "@/modules/admin/list-prospects"

export type ProspectPatch = Partial<
  Pick<ProspectRow, "email" | "phone" | "crm" | "clinic" | "notes" | "next_contact_at" | "last_contact_at" | "last_channel"> & {
    status: ProspectStatus
  }
>

/** Salva os campos editáveis de um prospect e devolve a linha atualizada. */
export async function updateProspect(
  supabase: SupabaseClient,
  id: string,
  patch: ProspectPatch,
): Promise<ProspectRow> {
  const { data, error } = await supabase
    .from("prospects")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle()
  if (error) throw new Error(`[ADMIN] Failed to update prospect: ${error.message}`)
  if (!data) throw new Error("[ADMIN] Prospect não encontrado.")
  const [row] = await attachProfiles(supabase, [data as Omit<ProspectRow, "profile">])
  return row!
}
