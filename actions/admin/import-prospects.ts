"use server"

import { requireAdminAction } from "@/actions/admin/require-admin"
import { importProspects, type ImportResult } from "@/modules/admin/import-prospects"

const MAX_CSV_BYTES = 5 * 1024 * 1024

/** Botão "Importar CSV" do funil: o arquivo da ferramenta de captação, rodada localmente. */
export async function importProspectsAction(csv: string): Promise<{ ok: true; result: ImportResult } | { ok: false; error: string }> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  if (typeof csv !== "string" || csv.length > MAX_CSV_BYTES) return { ok: false, error: "Arquivo grande demais (máx. 5 MB)." }
  try {
    return { ok: true, result: await importProspects(gate.admin, csv) }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message.replace(/^\[ADMIN\] /, "") : "Falha ao importar." }
  }
}
