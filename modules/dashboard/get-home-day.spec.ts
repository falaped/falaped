import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getHomeDay } from "@/modules/dashboard/get-home-day"

/**
 * Mock que devolve linhas fixas por tabela, na ordem das leituras: `cases` 1ª = encerradas
 * do mês, 2ª = recentes, 3ª = últimas encerradas; `financial_entries` 1ª = formas de
 * pagamento do mês, 2ª = lançamentos das consultas do mês. Contagens vêm de `counts`.
 */
function mockSupabase(tables: Record<string, unknown[][]>, counts: Record<string, number> = {}) {
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
        then: (resolve: (r: { data: unknown[]; count: number; error: null }) => void) =>
          resolve({ data: tables[table]?.[index] ?? [], count: counts[table] ?? 0, error: null }),
      }
      return builder
    },
  } as unknown as SupabaseClient
}

const WINDOW = {
  todayStartIso: "2026-10-07T03:00:00.000Z",
  monthStartIso: "2026-10-01T03:00:00.000Z",
  monthStartDate: "2026-10-01",
  recentSinceIso: "2026-07-09T00:00:00.000Z",
  measuredSinceIso: "2026-04-10",
}
const P = (id: string, name: string) => ({ id, name, birth_date: "2024-01-01" })

test("Início: dia, mês, sem valor, rascunho, medida antiga e lembretes", async () => {
  const supabase = mockSupabase(
    {
      cases: [
        [
          { id: "c1", ended_at: "2026-10-07T13:00:00.000Z", summary: "• Diarreia aguda, sem sangue", patient: P("p1", "Davi") },
          { id: "c2", ended_at: "2026-10-07T12:00:00.000Z", summary: null, patient: P("p2", "Helena") },
          { id: "c3", ended_at: "2026-10-04T17:00:00.000Z", summary: "• Puericultura: ok", patient: P("p3", "Sofia") },
          { id: "c4", ended_at: "2026-10-03T17:00:00.000Z", summary: null, earnings_prompted_at: "2026-10-03T17:01:00.000Z", patient: P("p4", "Gael") },
        ],
        [{ patient_id: "p2" }, { patient_id: "p3" }],
        [
          { id: "c2", ended_at: "2026-10-07T12:00:00.000Z", patient: P("p2", "Helena") },
          { id: "c1", ended_at: "2026-10-07T13:00:00.000Z", patient: P("p1", "Davi") },
        ],
      ],
      case_reports: [[
        { case: { id: "c2", status: "closed", ended_at: "2026-10-07T12:00:00.000Z", summary: null, patient: P("p2", "Helena") } },
        { case: { id: "c9", status: "active", ended_at: null, summary: null, patient: null } },
      ]],
      financial_entries: [
        [{ payment_method: "card" }, { payment_method: "pix" }, { payment_method: "pix" }],
        [{ case_id: "c1" }, { case_id: "c2" }],
      ],
      patients: [[{ id: "p2", name: "Helena", birth_date: "2025-11-20" }, { id: "p3", name: "Sofia", birth_date: "2021-07-28" }]],
      patient_measurements: [[{ patient_id: "p2", measured_on: "2026-10-07" }, { patient_id: "p3", measured_on: "2026-02-10" }]],
      case_reminders: [[
        { id: "r1", case_id: "c2", text: "Conferir a Meningo B", created_at: "2026-10-07T12:00:00.000Z" },
        { id: "r2", case_id: "c1", text: "Ligar amanhã", created_at: "2026-10-07T13:00:00.000Z" },
      ]],
    },
    { prescriptions: 2, medical_certificates: 1, exam_requests: 1, referrals: 0, guidance_documents: 1, medical_reports: 1 },
  )

  const result = await getHomeDay(supabase, "profile", WINDOW)

  assert.deepEqual(result.today, { closedCount: 2, billedCount: 2, prescriptions: 2, certificates: 1, otherDocuments: 3 })
  assert.deepEqual(result.month, { closedCount: 4, billedCount: 2, paymentMethods: ["pix", "card"] })
  assert.deepEqual(result.unbilled.map((c) => [c.caseId, c.patientName, c.reason]), [["c3", "Sofia", "Puericultura"]])
  assert.deepEqual(result.drafts.map((c) => c.caseId), ["c2"])
  assert.deepEqual(result.staleMeasure.map((p) => [p.patientId, p.lastMeasuredOn]), [["p3", "2026-02-10"]])
  // Lembretes na ordem das consultas: a do Davi terminou depois.
  assert.deepEqual(result.reminders.map((r) => [r.patientName, r.text]), [["Davi", "Ligar amanhã"], ["Helena", "Conferir a Meningo B"]])
})

test("sem consultas: tudo zerado e vazio", async () => {
  const result = await getHomeDay(mockSupabase({}), "profile", WINDOW)
  assert.deepEqual(result, {
    today: { closedCount: 0, billedCount: 0, prescriptions: 0, certificates: 0, otherDocuments: 0 },
    month: { closedCount: 0, billedCount: 0, paymentMethods: [] },
    unbilled: [],
    drafts: [],
    staleMeasure: [],
    reminders: [],
  })
})
