import type { SupabaseClient } from "@supabase/supabase-js"

import { parseCsv } from "@/lib/parse-csv"

/** Colunas da ferramenta de captação (as mesmas do seed). Só dados captados: etapa e histórico não mudam. */
const TEXT = ["kind", "title", "name", "full_name", "city", "email", "phone", "crm", "rqe", "clinic", "address", "website", "profile_url", "map_url", "price", "rating", "reviews"] as const
const LISTS = ["site_emails", "sources"] as const

export type ImportResult = { inserted: number; updated: number; skipped: { id: string; reason: string }[] }

const list = (v: string | undefined) => (v ? v.split(/\s*[|;]\s*|,\s+(?=\S+@)/).map((s) => s.trim()).filter(Boolean) : [])
const bool = (v: string | undefined) => /^(true|sim|s|1|yes)$/i.test(v ?? "")

/**
 * Importa o CSV da captação: atualiza quem já existe pelo `id` e cria os novos. Um id novo
 * com e-mail de alguém que já está no funil é pulado (a mesma pessoa veio de outra fonte).
 */
export async function importProspects(supabase: SupabaseClient, csv: string): Promise<ImportResult> {
  const rows = parseCsv(csv)
  if (rows.length === 0) throw new Error("[ADMIN] CSV vazio ou sem cabeçalho.")
  if (!("id" in rows[0]) || !("name" in rows[0] || "full_name" in rows[0]))
    throw new Error("[ADMIN] O CSV precisa das colunas id e name (ou full_name).")

  const { data: existing, error } = await supabase.from("prospects").select("id, email")
  if (error) throw new Error(`[ADMIN] Falha ao ler o funil: ${error.message}`)
  const before = new Set((existing ?? []).map((p) => p.id))
  const ids = new Set(before)
  const emailOwner = new Map((existing ?? []).filter((p) => p.email).map((p) => [p.email!.toLowerCase(), p.id]))

  const result: ImportResult = { inserted: 0, updated: 0, skipped: [] }
  const upserts: Record<string, unknown>[] = []
  for (const r of rows) {
    const id = r.id
    if (!id) {
      result.skipped.push({ id: "(sem id)", reason: "linha sem id" })
      continue
    }
    const email = r.email?.toLowerCase() || null
    const owner = email ? emailOwner.get(email) : undefined
    if (!ids.has(id) && owner) {
      result.skipped.push({ id, reason: `e-mail já está em ${owner}` })
      continue
    }
    const fullName = r.full_name || [r.title, r.name].filter(Boolean).join(" ")
    const row: Record<string, unknown> = { id, name: r.name || fullName, full_name: fullName }
    for (const k of TEXT) if (k in r && k !== "name" && k !== "full_name") row[k] = r[k] || null
    for (const k of LISTS) if (k in r) row[k] = list(r[k])
    if ("has_whatsapp" in r) row.has_whatsapp = bool(r.has_whatsapp)
    if ("kind" in r) row.kind = r.kind === "clínica" ? "clínica" : "médico"
    if (ids.has(id)) result.updated += 1
    else {
      result.inserted += 1
      ids.add(id)
      if (email) emailOwner.set(email, id)
    }
    upserts.push(row)
  }

  for (let i = 0; i < upserts.length; i += 500) {
    const { error: upsertError } = await supabase.from("prospects").upsert(upserts.slice(i, i + 500), { onConflict: "id" })
    if (upsertError) throw new Error(`[ADMIN] Falha ao importar: ${upsertError.message}`)
  }
  const created = upserts.filter((r) => !before.has(r.id as string))
  if (created.length > 0) {
    const { error: eventError } = await supabase.from("prospect_events").insert(
      created.map((r) => ({ prospect_id: r.id, kind: "captado", detail: ((r.sources as string[]) ?? []).join(", ") || "CSV" })),
    )
    if (eventError) throw new Error(`[ADMIN] Importado, mas falhou ao registrar a captação: ${eventError.message}`)
  }
  return result
}
