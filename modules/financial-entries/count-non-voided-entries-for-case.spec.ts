import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { countNonVoidedEntriesForCase } from "@/modules/financial-entries/count-non-voided-entries-for-case"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const CASE_ID = "22222222-2222-2222-2222-222222222222"

type FilterCall = { kind: "eq" | "is"; column: string; value: unknown }

/**
 * SupabaseClient mock que GRAVA os filtros aplicados ao select da contagem, para
 * afirmar os TRÊS predicados juntos (`profile_id`, `case_id`, `voided_at is null`).
 * Cada filtro que faltar é um bug distinto e explorável — ver a mensagem de cada assert.
 */
function buildSupabaseMock(count: number | null = 0) {
  const filterCalls: FilterCall[] = []
  const selectCalls: { columns: string; options: unknown }[] = []

  const client = {
    from(table: string) {
      const builder = {
        select(columns: string, options?: unknown) {
          if (table === "financial_entries") selectCalls.push({ columns, options })
          return builder
        },
        eq(column: string, value: unknown) {
          if (table === "financial_entries")
            filterCalls.push({ kind: "eq", column, value })
          return builder
        },
        is(column: string, value: unknown) {
          if (table === "financial_entries")
            filterCalls.push({ kind: "is", column, value })
          return builder
        },
        then(resolve: (r: { count: number | null; error: null }) => void) {
          resolve({ count, error: null })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient

  return { client, filterCalls, selectCalls }
}

test("countNonVoidedEntriesForCase filtra por profile_id (isolamento entre médicos)", async () => {
  const { client, filterCalls } = buildSupabaseMock()
  await countNonVoidedEntriesForCase(client, PROFILE_ID, CASE_ID)

  assert.ok(
    filterCalls.some(
      (c) => c.kind === "eq" && c.column === "profile_id" && c.value === PROFILE_ID,
    ),
    "sem .eq('profile_id') a contagem enxergaria lançamentos de OUTRO médico e a guarda D-10 silenciaria o form de um caso que nunca faturou",
  )
})

test("countNonVoidedEntriesForCase filtra por case_id (a guarda é por caso)", async () => {
  const { client, filterCalls } = buildSupabaseMock()
  await countNonVoidedEntriesForCase(client, PROFILE_ID, CASE_ID)

  assert.ok(
    filterCalls.some(
      (c) => c.kind === "eq" && c.column === "case_id" && c.value === CASE_ID,
    ),
    "sem .eq('case_id') a contagem viraria a do perfil inteiro e NENHUM caso voltaria a perguntar o que foi cobrado",
  )
})

test("countNonVoidedEntriesForCase filtra voided_at nulo (anulado não conta como faturado)", async () => {
  const { client, filterCalls } = buildSupabaseMock()
  await countNonVoidedEntriesForCase(client, PROFILE_ID, CASE_ID)

  assert.ok(
    filterCalls.some(
      (c) => c.kind === "is" && c.column === "voided_at" && c.value === null,
    ),
    "sem .is('voided_at', null) um lançamento ANULADO bloquearia o relançamento — o médico anularia para corrigir e o app nunca mais perguntaria",
  )
})

test("countNonVoidedEntriesForCase não trafega linhas (count exact + head)", async () => {
  const { client, selectCalls } = buildSupabaseMock()
  await countNonVoidedEntriesForCase(client, PROFILE_ID, CASE_ID)

  const options = selectCalls[0]?.options as
    | { count?: string; head?: boolean }
    | undefined
  assert.equal(options?.count, "exact", "a contagem precisa ser exact")
  assert.equal(
    options?.head,
    true,
    "head: true evita trafegar as linhas — só o predicado do índice parcial importa",
  )
})

test("countNonVoidedEntriesForCase devolve 0 quando o count vem nulo", async () => {
  const { client } = buildSupabaseMock(null)
  const result = await countNonVoidedEntriesForCase(client, PROFILE_ID, CASE_ID)

  assert.equal(
    result,
    0,
    "count nulo tem de virar 0, senão a guarda D-10 compararia undefined > 0 e nunca perguntaria",
  )
})
