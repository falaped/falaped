import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { listFinancialEntries } from "@/modules/financial-entries/list-financial-entries"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"

type FilterCall = { kind: string; column: string; value: unknown }

/**
 * Mock gravador dos filtros aplicados à leitura de `financial_entries`.
 *
 * O que ele protege: o DEFAULT SEGURO de anulados (D-21). Se a listagem parar de
 * aplicar o filtro de anulação quando o parâmetro é omitido, linhas anuladas vazam
 * para toda tela que lista lançamentos — silenciosamente, sem erro de tipo.
 */
function buildSupabaseMock() {
  const filters: FilterCall[] = []
  const orders: { column: string; ascending: boolean | undefined }[] = []

  const client = {
    from() {
      const builder = {
        select() {
          return builder
        },
        eq(column: string, value: unknown) {
          filters.push({ kind: "eq", column, value })
          return builder
        },
        gte(column: string, value: unknown) {
          filters.push({ kind: "gte", column, value })
          return builder
        },
        lt(column: string, value: unknown) {
          filters.push({ kind: "lt", column, value })
          return builder
        },
        is(column: string, value: unknown) {
          filters.push({ kind: "is", column, value })
          return builder
        },
        order(column: string, opts?: { ascending?: boolean }) {
          orders.push({ column, ascending: opts?.ascending })
          return builder
        },
        then(resolve: (r: { data: unknown[]; error: null }) => void) {
          resolve({ data: [], error: null })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient

  return { client, filters, orders }
}

test("listFinancialEntries esconde anulados por DEFAULT (parâmetro omitido)", async () => {
  const { client, filters } = buildSupabaseMock()
  await listFinancialEntries(client, PROFILE_ID, {})

  assert.ok(
    filters.some(
      (f) => f.kind === "is" && f.column === "voided_at" && f.value === null,
    ),
    "sem o parâmetro de incluir anulados, a listagem PRECISA filtrar os anulados: o default é seguro",
  )
})

test("listFinancialEntries NÃO filtra anulados quando pedido explicitamente", async () => {
  const { client, filters } = buildSupabaseMock()
  await listFinancialEntries(client, PROFILE_ID, { includeVoided: true })

  assert.ok(
    !filters.some((f) => f.kind === "is" && f.column === "voided_at"),
    "com o parâmetro ligado, o filtro de anulação não pode ser aplicado — é assim que as linhas anuladas aparecem intercaladas",
  )
})

test("listFinancialEntries filtra SEMPRE pelo perfil", async () => {
  const { client, filters } = buildSupabaseMock()
  await listFinancialEntries(client, PROFILE_ID, { includeVoided: true })

  assert.ok(
    filters.some(
      (f) =>
        f.kind === "eq" && f.column === "profile_id" && f.value === PROFILE_ID,
    ),
    "o escopo de posse é obrigatório em toda leitura, com ou sem anulados",
  )
})

test("listFinancialEntries aplica a janela MEIO-ABERTA e o caso quando vêm", async () => {
  const { client, filters } = buildSupabaseMock()
  await listFinancialEntries(client, PROFILE_ID, {
    from: "2026-08-01",
    to: "2026-09-01",
    caseId: "33333333-3333-3333-3333-333333333333",
  })

  assert.ok(
    filters.some(
      (f) =>
        f.kind === "gte" &&
        f.column === "received_on" &&
        f.value === "2026-08-01",
    ),
    "o início do período entra na janela",
  )
  assert.ok(
    filters.some(
      (f) =>
        f.kind === "lt" && f.column === "received_on" && f.value === "2026-09-01",
    ),
    "o fim do período fica FORA da janela — igual à função SQL",
  )
  assert.ok(
    filters.some((f) => f.kind === "eq" && f.column === "case_id"),
    "o filtro por caso é aplicado quando o caso vem",
  )
})

test("listFinancialEntries ordena por data de recebimento com desempate por criação", async () => {
  const { client, orders } = buildSupabaseMock()
  await listFinancialEntries(client, PROFILE_ID, {})

  assert.deepEqual(
    orders,
    [
      { column: "received_on", ascending: true },
      { column: "created_at", ascending: true },
    ],
    "a ordem entre linhas de mesma data é ESPECIFICADA, não incidental — e vem do SQL, nunca de um sort no componente",
  )
})
