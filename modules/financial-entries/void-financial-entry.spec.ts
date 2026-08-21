import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { voidFinancialEntry } from "@/modules/financial-entries/void-financial-entry"
import { restoreFinancialEntry } from "@/modules/financial-entries/restore-financial-entry"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const ENTRY_ID = "22222222-2222-2222-2222-222222222222"

type EqCall = { column: string; value: unknown }

/**
 * Mock de SupabaseClient que grava os filtros aplicados ao UPDATE de
 * `financial_entries` mais o objeto de patch, para afirmar que:
 *
 * 1. a mutação é escopada por id E por perfil (backstop de posse contra IDOR,
 *    T-10-31 — um update escopado só pelo id é exatamente o bug explorável);
 * 2. só a coluna de anulação é escrita — é isso que impede a policy de UPDATE do
 *    banco de virar uma porta de edição de valor (D-19 / T-10-34).
 *
 * Mesma forma do gravador de `modules/patient-growth/delete-measurement.spec.ts`.
 */
function buildSupabaseMock() {
  const updateEqCalls: EqCall[] = []
  const patches: Record<string, unknown>[] = []

  const client = {
    from(table: string) {
      let mode: "update" | null = null
      const builder = {
        update(patch: Record<string, unknown>) {
          mode = "update"
          if (table === "financial_entries") patches.push(patch)
          return builder
        },
        eq(column: string, value: unknown) {
          if (table === "financial_entries" && mode === "update")
            updateEqCalls.push({ column, value })
          return builder
        },
        then(resolve: (r: { data: unknown; error: null }) => void) {
          resolve({ data: null, error: null })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient

  return { client, updateEqCalls, patches }
}

test("voidFinancialEntry escopa o update pelo id do lançamento", async () => {
  const { client, updateEqCalls } = buildSupabaseMock()
  await voidFinancialEntry(client, ENTRY_ID, PROFILE_ID)

  assert.ok(
    updateEqCalls.some((c) => c.column === "id" && c.value === ENTRY_ID),
    "a anulação precisa ser escopada pelo id do lançamento",
  )
})

test("voidFinancialEntry escopa o update pelo perfil (guarda de IDOR)", async () => {
  const { client, updateEqCalls } = buildSupabaseMock()
  await voidFinancialEntry(client, ENTRY_ID, PROFILE_ID)

  assert.ok(
    updateEqCalls.some((c) => c.column === "profile_id" && c.value === PROFILE_ID),
    "a anulação precisa ser escopada pelo perfil — filtrar somente pelo id é proibido, porque anularia lançamento de outro médico por UUID",
  )
})

test("voidFinancialEntry aplica os DOIS filtros juntos", async () => {
  const { client, updateEqCalls } = buildSupabaseMock()
  await voidFinancialEntry(client, ENTRY_ID, PROFILE_ID)

  const columns = updateEqCalls.map((c) => c.column)
  assert.ok(columns.includes("id"), "falta o escopo por id")
  assert.ok(columns.includes("profile_id"), "falta o escopo por perfil")
})

test("voidFinancialEntry escreve APENAS a coluna de anulação", async () => {
  const { client, patches } = buildSupabaseMock()
  await voidFinancialEntry(client, ENTRY_ID, PROFILE_ID)

  assert.equal(patches.length, 1, "um único update")
  const keys = Object.keys(patches[0])
  assert.deepEqual(
    keys,
    ["voided_at"],
    "nenhuma outra coluna pode ser escrita: a policy de UPDATE do banco não é uma porta de edição de valor",
  )
  assert.equal(
    typeof patches[0].voided_at,
    "string",
    "anular grava um timestamp",
  )
})

test("restoreFinancialEntry escopa o update por id E por perfil e só zera a anulação", async () => {
  const { client, updateEqCalls, patches } = buildSupabaseMock()
  await restoreFinancialEntry(client, ENTRY_ID, PROFILE_ID)

  const columns = updateEqCalls.map((c) => c.column)
  assert.ok(columns.includes("id"), "falta o escopo por id")
  assert.ok(
    columns.includes("profile_id"),
    "falta o escopo por perfil — restaurar lançamento alheio seria o mesmo IDOR",
  )
  assert.deepEqual(Object.keys(patches[0]), ["voided_at"])
  assert.equal(patches[0].voided_at, null, "restaurar zera a anulação")
})
