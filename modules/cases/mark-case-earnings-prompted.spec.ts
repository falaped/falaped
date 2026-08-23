import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { markCaseEarningsPrompted } from "@/modules/cases/mark-case-earnings-prompted"

const CASE_ID = "22222222-2222-2222-2222-222222222222"

type FilterCall = { kind: "eq" | "is"; column: string; value: unknown }

/**
 * Mock que GRAVA o payload e os filtros do update, para afirmar as duas propriedades
 * que a regra "perguntar uma vez por caso" depende:
 * o update é escopado no caso e só vale para a PRIMEIRA resposta.
 */
function buildSupabaseMock() {
  const filterCalls: FilterCall[] = []
  const payloads: Record<string, unknown>[] = []

  const client = {
    from(table: string) {
      const builder = {
        update(payload: Record<string, unknown>) {
          if (table === "cases") payloads.push(payload)
          return builder
        },
        eq(column: string, value: unknown) {
          if (table === "cases") filterCalls.push({ kind: "eq", column, value })
          return builder
        },
        is(column: string, value: unknown) {
          if (table === "cases") filterCalls.push({ kind: "is", column, value })
          return builder
        },
        then(resolve: (r: { error: null }) => void) {
          resolve({ error: null })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient

  return { client, filterCalls, payloads }
}

test("markCaseEarningsPrompted escopa o update no caso e preserva a primeira resposta", async () => {
  const { client, filterCalls, payloads } = buildSupabaseMock()
  await markCaseEarningsPrompted(client, CASE_ID)

  assert.ok(
    filterCalls.some((c) => c.kind === "eq" && c.column === "id" && c.value === CASE_ID),
    "sem .eq('id') o update marcaria TODOS os casos visíveis pela RLS e nenhum atendimento voltaria a perguntar o faturamento",
  )
  assert.ok(
    filterCalls.some((c) => c.kind === "is" && c.column === "earnings_prompted_at" && c.value === null),
    "sem .is('earnings_prompted_at', null) uma segunda chamada (duplo clique, action reexecutado) reescreveria o timestamp da primeira resposta",
  )
  assert.equal(payloads.length, 1, "um único update")
  assert.ok(
    typeof payloads[0].earnings_prompted_at === "string",
    "o payload precisa gravar o instante da resposta, não um booleano",
  )
})

test("markCaseEarningsPrompted propaga a falha do banco com tag de domínio", async () => {
  const client = {
    from() {
      const builder = {
        update: () => builder,
        eq: () => builder,
        is: () => builder,
        then(resolve: (r: { error: { message: string } }) => void) {
          resolve({ error: { message: "permission denied" } })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient

  await assert.rejects(
    () => markCaseEarningsPrompted(client, CASE_ID),
    /\[CASES\] Failed to mark earnings prompt: permission denied/,
    "engolir o erro marcaria o caso como respondido sem que o banco tivesse gravado nada",
  )
})
