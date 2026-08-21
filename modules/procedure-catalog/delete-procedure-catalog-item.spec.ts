import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { deleteProcedureCatalogItem } from "@/modules/procedure-catalog/delete-procedure-catalog-item"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const ITEM_ID = "44444444-4444-4444-4444-444444444444"

type EqCall = { column: string; value: unknown }

/**
 * Mock de `SupabaseClient` que GRAVA os filtros `.eq()` aplicados ao DELETE em
 * procedure_catalog_items, para afirmar que a mutação é escopada por id E por
 * profile_id (backstop de posse / defesa de IDOR — T-10-16). Um delete escopado
 * só por id é exatamente o bug explorável que este teste guarda.
 */
function buildSupabaseMock() {
  const deleteEqCalls: EqCall[] = []

  const client = {
    from(table: string) {
      let mode: "delete" | null = null
      const builder = {
        delete() {
          mode = "delete"
          return builder
        },
        eq(column: string, value: unknown) {
          if (table === "procedure_catalog_items" && mode === "delete")
            deleteEqCalls.push({ column, value })
          return builder
        },
        then(resolve: (r: { data: unknown; error: null }) => void) {
          resolve({ data: null, error: null })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient

  return { client, deleteEqCalls }
}

test("deleteProcedureCatalogItem escopa o delete por id", async () => {
  const { client, deleteEqCalls } = buildSupabaseMock()
  await deleteProcedureCatalogItem(client, ITEM_ID, PROFILE_ID)

  assert.ok(
    deleteEqCalls.some((c) => c.column === "id" && c.value === ITEM_ID),
    "o delete tem de ser escopado por .eq('id', id)",
  )
})

test("deleteProcedureCatalogItem escopa o delete por profile_id (guarda de IDOR)", async () => {
  const { client, deleteEqCalls } = buildSupabaseMock()
  await deleteProcedureCatalogItem(client, ITEM_ID, PROFILE_ID)

  assert.ok(
    deleteEqCalls.some(
      (c) => c.column === "profile_id" && c.value === PROFILE_ID,
    ),
    "o delete tem de ser escopado por .eq('profile_id', profileId) — filtrar só por id é proibido",
  )
})

test("deleteProcedureCatalogItem aplica os dois filtros de posse juntos", async () => {
  const { client, deleteEqCalls } = buildSupabaseMock()
  await deleteProcedureCatalogItem(client, ITEM_ID, PROFILE_ID)

  const columns = deleteEqCalls.map((c) => c.column)
  assert.ok(columns.includes("id"), "escopo de id ausente")
  assert.ok(columns.includes("profile_id"), "escopo de profile_id ausente")
})
