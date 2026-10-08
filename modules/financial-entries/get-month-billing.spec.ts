import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getMonthBilling } from "@/modules/financial-entries/get-month-billing"

function mockSupabase(tables: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const builder = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        in: () => builder,
        gte: () => builder,
        lt: () => builder,
        order: () => builder,
        then: (resolve: (r: { data: unknown[]; error: null }) => void) => resolve({ data: tables[table] ?? [], error: null }),
      }
      return builder
    },
  } as unknown as SupabaseClient
}

test("sem valor: nem lançada nem cortesia", async () => {
  const P = (id: string, name: string) => ({ id, name, birth_date: null })
  const result = await getMonthBilling(
    mockSupabase({
      cases: [
        { id: "c1", ended_at: "2026-10-07T13:00:00Z", summary: null, earnings_prompted_at: "2026-10-07T13:01:00Z", patient: P("p1", "Davi") },
        { id: "c2", ended_at: "2026-10-06T13:00:00Z", summary: "• Puericultura: ok", earnings_prompted_at: null, patient: P("p2", "Sofia") },
        { id: "c3", ended_at: "2026-10-05T13:00:00Z", summary: null, earnings_prompted_at: "2026-10-05T13:01:00Z", patient: P("p3", "Gael") },
      ],
      financial_entries: [{ case_id: "c1" }],
    }),
    "profile",
    "2026-10-01T03:00:00Z",
    "2026-11-01T03:00:00Z",
  )
  assert.equal(result.closedCount, 3)
  assert.equal(result.billedCount, 1)
  assert.deepEqual(result.unbilled.map((c) => [c.caseId, c.reason]), [["c2", "Puericultura"]])
})
