import type { SupabaseClient } from "@supabase/supabase-js"

import { attachProfiles, type ProspectRow } from "@/modules/admin/list-prospects"

export type ProspectEventKind =
  | "captado" | "lead" | "indicacao" | "email" | "whatsapp" | "telefone" | "nota" | "etapa"
  | "entregue" | "aberto" | "clicou" | "bounce" | "reclamou"

export type ProspectEvent = { id: number; kind: ProspectEventKind; detail: string | null; created_at: string }

/** Um prospect com o perfil vinculado e a linha do tempo (mais novo primeiro). Exige service role. */
export async function getProspect(
  supabase: SupabaseClient,
  id: string,
): Promise<(ProspectRow & { events: ProspectEvent[] }) | null> {
  const [{ data, error }, { data: events, error: eventsError }] = await Promise.all([
    supabase.from("prospects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("prospect_events")
      .select("id, kind, detail, created_at")
      .eq("prospect_id", id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
  ])
  if (error) throw new Error(`[ADMIN] Falha ao buscar o prospect: ${error.message}`)
  if (eventsError) throw new Error(`[ADMIN] Falha ao buscar a linha do tempo: ${eventsError.message}`)
  if (!data) return null
  const [row] = await attachProfiles(supabase, [data as Omit<ProspectRow, "profile">])
  return { ...row!, events: (events ?? []) as ProspectEvent[] }
}
