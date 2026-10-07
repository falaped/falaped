import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getConsultIndexByPatient } from "@/modules/cases/get-consult-index-by-patient"

function mockSupabase(rows: unknown[]) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (resolve: (r: { data: unknown[]; error: null }) => void) => resolve({ data: rows, error: null }),
  }
  return { from: () => builder } as unknown as SupabaseClient
}

test("guarda a consulta mais recente de cada criança e a aberta", async () => {
  // Linhas já vêm do banco da mais recente para a mais antiga.
  const index = await getConsultIndexByPatient(
    mockSupabase([
      { id: "c3", origin: "dashboard", status: "active", started_at: "2026-10-07T13:00:00Z", patient_id: "helena" },
      { id: "c2", origin: "dashboard", status: "closed", started_at: "2026-10-07T11:00:00Z", patient_id: "miguel" },
      { id: "c1", origin: "whatsapp", status: "closed", started_at: "2026-10-01T11:00:00Z", patient_id: "helena" },
      { id: "c0", origin: "whatsapp", status: "closed", started_at: "2026-09-01T11:00:00Z", patient_id: null },
    ]),
    "profile",
  )
  assert.deepEqual(index.lastConsultAt, { helena: "2026-10-07T13:00:00Z", miguel: "2026-10-07T11:00:00Z" })
  assert.deepEqual(index.activeCase, { id: "c3", origin: "dashboard", startedAt: "2026-10-07T13:00:00Z", patientId: "helena" })
})

test("sem consulta aberta, activeCase é null", async () => {
  const index = await getConsultIndexByPatient(mockSupabase([]), "profile")
  assert.equal(index.activeCase, null)
  assert.deepEqual(index.lastConsultAt, {})
})
