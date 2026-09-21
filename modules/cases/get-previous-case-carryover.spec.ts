import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getPreviousCaseCarryover } from "@/modules/cases/get-previous-case-carryover"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const PHONE = "5511999999999"
const PATIENT_ID = "22222222-2222-2222-2222-222222222222"
const CURRENT_CASE_ID = "33333333-3333-3333-3333-333333333333"

type Call = { method: string; column: string; value: unknown }

/**
 * Mock consciente da tabela: a leitura do caso termina em `.limit()`, a dos
 * lembretes em `.order()`. Registra os filtros das DUAS para provar o escopo.
 */
function buildMock(caseRows: unknown[], reminderRows: unknown[] = []) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const builder = {
        select: (_c: string) => builder,
        eq(column: string, value: unknown) {
          calls.push({ method: "eq", column, value })
          return builder
        },
        neq(column: string, value: unknown) {
          calls.push({ method: "neq", column, value })
          return builder
        },
        order: (_c: string, _o: { ascending: boolean }) =>
          table === "case_reminders"
            ? Promise.resolve({ data: reminderRows, error: null })
            : builder,
        limit: (_n: number) => Promise.resolve({ data: caseRows, error: null }),
      }
      return builder as never
    },
  } as unknown as SupabaseClient
  return { client, calls }
}

test("escopa por telefone e paciente, e exclui o caso atual", async () => {
  const { client, calls } = buildMock([])
  await getPreviousCaseCarryover(client, PROFILE_ID, PHONE, PATIENT_ID, CURRENT_CASE_ID)

  assert.deepEqual(calls, [
    { method: "eq", column: "user_phone", value: PHONE },
    { method: "eq", column: "patient_id", value: PATIENT_ID },
    { method: "neq", column: "id", value: CURRENT_CASE_ID },
  ])
})

test("sem caso atual (ficha do paciente), não exclui nada", async () => {
  const { client, calls } = buildMock([])
  await getPreviousCaseCarryover(client, PROFILE_ID, PHONE, PATIENT_ID)

  assert.ok(!calls.some((c) => c.method === "neq"))
})

test("consulta anterior sem resumo E sem lembrete não vira modal", async () => {
  const { client } = buildMock(
    [
      {
        id: "c1",
        started_at: "2026-09-01T10:00:00Z",
        ended_at: "2026-09-01T10:30:00Z",
        summary: "   ",
      },
    ],
    [],
  )
  assert.equal(
    await getPreviousCaseCarryover(client, PROFILE_ID, PHONE, PATIENT_ID, CURRENT_CASE_ID),
    null,
  )
})

test("lembretes vêm como itens separados, e um só já carrega para a próxima", async () => {
  const { client } = buildMock(
    [
      {
        id: "c1",
        started_at: "2026-09-01T10:00:00Z",
        ended_at: null,
        summary: null,
      },
    ],
    [
      { id: "r1", profile_id: PROFILE_ID, case_id: "c1", text: "Pedir hemograma", created_at: "x" },
      { id: "r2", profile_id: PROFILE_ID, case_id: "c1", text: "Reavaliar em 15 dias", created_at: "y" },
    ],
  )

  const carryover = await getPreviousCaseCarryover(
    client,
    PHONE,
    PATIENT_ID,
    CURRENT_CASE_ID,
  )

  assert.deepEqual(carryover, {
    caseId: "c1",
    startedAt: "2026-09-01T10:00:00Z",
    endedAt: null,
    summary: null,
    reminders: ["Pedir hemograma", "Reavaliar em 15 dias"],
  })
})

test("sem consulta anterior, devolve null", async () => {
  const { client } = buildMock([])
  assert.equal(
    await getPreviousCaseCarryover(client, PROFILE_ID, PHONE, PATIENT_ID, CURRENT_CASE_ID),
    null,
  )
})
