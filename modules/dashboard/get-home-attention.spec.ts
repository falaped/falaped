import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getHomeAttention } from "@/modules/dashboard/get-home-attention"

/** Mock que devolve linhas fixas por tabela; a 1ª leitura de `cases` são as encerradas do mês, a 2ª as recentes. */
function mockSupabase(tables: Record<string, unknown[][]>) {
  const calls: Record<string, number> = {}
  return {
    from(table: string) {
      const index = calls[table] ?? 0
      calls[table] = index + 1
      const builder = {
        select: () => builder,
        eq: () => builder,
        not: () => builder,
        gte: () => builder,
        is: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        then: (resolve: (r: { data: unknown[]; error: null }) => void) => resolve({ data: tables[table]?.[index] ?? [], error: null }),
      }
      return builder
    },
  } as unknown as SupabaseClient
}

const WINDOW = { monthStartIso: "2026-10-01T03:00:00.000Z", recentSinceIso: "2026-07-09T00:00:00.000Z", measuredSinceIso: "2026-04-10" }

test("pendências do Início: cobrança, ficha incompleta e medida antiga", async () => {
  const supabase = mockSupabase({
    cases: [
      [{ id: "c1" }, { id: "c2" }, { id: "c3" }],
      [{ patient_id: "p2" }, { patient_id: "p1" }, { patient_id: "p2" }, { patient_id: "p3" }],
    ],
    financial_entries: [[{ case_id: "c2" }]],
    patients: [[
      { id: "p1", name: "Ana", birth_date: "2024-01-01", sex: "female" },
      { id: "p2", name: "Bia", birth_date: null, sex: null },
      { id: "p3", name: "Caio", birth_date: "2023-05-01", sex: "male" },
    ]],
    patient_measurements: [[
      { patient_id: "p1", measured_on: "2026-09-01" },
      { patient_id: "p1", measured_on: "2025-01-01" },
      { patient_id: "p3", measured_on: "2026-01-15" },
    ]],
  })

  const result = await getHomeAttention(supabase, "profile", WINDOW)

  assert.equal(result.unbilledCount, 2)
  assert.deepEqual(result.incomplete.map((p) => [p.patientId, p.missing]), [["p2", ["sex", "birth_date"]]])
  // Ordem de atendimento (p2 antes de p3); p1 tem medida recente.
  assert.deepEqual(result.staleMeasure.map((p) => [p.patientId, p.lastMeasuredOn]), [["p2", null], ["p3", "2026-01-15"]])
})

test("sem consultas: nada pendente e nenhuma consulta extra", async () => {
  const result = await getHomeAttention(mockSupabase({}), "profile", WINDOW)
  assert.deepEqual(result, { unbilledCount: 0, incomplete: [], staleMeasure: [] })
})
