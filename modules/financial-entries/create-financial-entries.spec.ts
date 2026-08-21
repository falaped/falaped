import test from "node:test"
import assert from "node:assert/strict"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createFinancialEntries } from "@/modules/financial-entries/create-financial-entries"

type Recorded = { table: string; rows: unknown; insertCalls: number }

// Mock mínimo de: .from(table).insert(rows).select("id")
function makeMockSupabase(
  error: { message: string } | null = null,
): { supabase: SupabaseClient; recorded: Recorded } {
  const recorded: Recorded = { table: "", rows: null, insertCalls: 0 }
  const supabase = {
    from: (table: string) => {
      recorded.table = table
      return {
        insert: (rows: unknown) => {
          recorded.rows = rows
          recorded.insertCalls += 1
          return {
            select: (_columns: string) =>
              Promise.resolve({
                data: error ? null : [{ id: "entry-1" }, { id: "entry-2" }],
                error,
              }),
          }
        },
      }
    },
  } as unknown as SupabaseClient
  return { supabase, recorded }
}

const ROW = {
  case_id: null,
  description: "Consulta particular sem caso",
  amount_cents: 25000,
  payment_method: "pix" as const,
  received_on: "2026-08-21",
}

test("createFinancialEntries emite UM único insert para duas linhas", async () => {
  const { supabase, recorded } = makeMockSupabase()
  await createFinancialEntries(supabase, "profile-1", [ROW, ROW])

  assert.equal(recorded.insertCalls, 1)
  assert.equal(recorded.table, "financial_entries")
  assert.ok(Array.isArray(recorded.rows))
  assert.equal((recorded.rows as unknown[]).length, 2)
})

test("createFinancialEntries estampa o profile_id do argumento, nunca do payload", async () => {
  const { supabase, recorded } = makeMockSupabase()
  await createFinancialEntries(supabase, "profile-do-gate", [
    { ...ROW, profile_id: "profile-forjado" } as never,
  ])

  const rows = recorded.rows as { profile_id: string }[]
  assert.equal(rows[0]?.profile_id, "profile-do-gate")
})

test("createFinancialEntries devolve os ids criados", async () => {
  const { supabase } = makeMockSupabase()
  const ids = await createFinancialEntries(supabase, "profile-1", [ROW, ROW])
  assert.deepEqual(ids, ["entry-1", "entry-2"])
})

test("createFinancialEntries lança erro com a tag de domínio", async () => {
  const { supabase } = makeMockSupabase({ message: "boom" })
  await assert.rejects(
    () => createFinancialEntries(supabase, "profile-1", [ROW]),
    /\[EARNINGS\].*boom/,
  )
})
