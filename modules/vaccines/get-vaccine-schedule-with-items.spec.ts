import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getVaccineScheduleWithItems } from "@/modules/vaccines/get-vaccine-schedule-with-items"

type Call = { method: string; args: unknown[] }

/**
 * Minimal fake Supabase query builder that records the chained calls and
 * resolves with the configured result. The builder is thenable via
 * `.maybeSingle()`, matching the module's usage.
 */
function makeFakeClient(result: { data: unknown; error: unknown }) {
  const calls: Call[] = []
  const builder: Record<string, unknown> = {}
  const record = (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args })
      return builder
    }
  builder.select = record("select")
  builder.eq = record("eq")
  builder.order = record("order")
  builder.maybeSingle = (...args: unknown[]) => {
    calls.push({ method: "maybeSingle", args })
    return Promise.resolve(result)
  }
  const from = (...args: unknown[]) => {
    calls.push({ method: "from", args })
    return builder
  }
  const client = { from } as unknown as SupabaseClient
  return { client, calls }
}

test("queries vaccine_schedules filtered by source only (no profile_id)", async () => {
  const { client, calls } = makeFakeClient({
    data: {
      id: "s1",
      source: "SUS",
      axis: "child_age",
      version: "PNI 2025",
      effective_date: "2025-01-01",
      notes: null,
      vaccine_schedule_items: [],
    },
    error: null,
  })

  await getVaccineScheduleWithItems(client, "SUS")

  assert.deepEqual(
    calls.find((c) => c.method === "from")?.args,
    ["vaccine_schedules"],
  )
  const eqCalls = calls.filter((c) => c.method === "eq")
  assert.equal(eqCalls.length, 1, "exactly one filter")
  assert.deepEqual(eqCalls[0].args, ["source", "SUS"])
  assert.ok(
    !eqCalls.some((c) => c.args[0] === "profile_id"),
    "must NOT filter by profile_id (global reference data, D-07)",
  )
})

test("orders nested items by sort_order ascending", async () => {
  const { client, calls } = makeFakeClient({ data: null, error: null })
  await getVaccineScheduleWithItems(client, "SUS")
  const orderCall = calls.find((c) => c.method === "order")
  assert.ok(orderCall, "orders the query")
  assert.equal(orderCall?.args[0], "sort_order")
  assert.deepEqual(orderCall?.args[1], {
    referencedTable: "vaccine_schedule_items",
    ascending: true,
  })
})

test("returns null when the dataset is unseeded", async () => {
  const { client } = makeFakeClient({ data: null, error: null })
  const result = await getVaccineScheduleWithItems(client, "SBIm")
  assert.equal(result, null)
})

test("returns the joined schedule when present", async () => {
  const data = {
    id: "s1",
    source: "SUS",
    axis: "child_age",
    version: "PNI 2025",
    effective_date: "2025-01-01",
    notes: null,
    vaccine_schedule_items: [
      {
        id: "i1",
        vaccine: "BCG",
        dose: "Dose única",
        age_months: 0,
        age_months_max: null,
        week_min: null,
        week_max: null,
        age_label: "Ao nascer",
        sort_order: 0,
        notes: null,
      },
    ],
  }
  const { client } = makeFakeClient({ data, error: null })
  const result = await getVaccineScheduleWithItems(client, "SUS")
  assert.equal(result?.id, "s1")
  assert.equal(result?.vaccine_schedule_items.length, 1)
})

test("throws a [VACCINES]-tagged error on Supabase failure", async () => {
  const { client } = makeFakeClient({
    data: null,
    error: { message: "boom" },
  })
  await assert.rejects(
    () => getVaccineScheduleWithItems(client, "SUS"),
    /\[VACCINES\].*boom/,
  )
})
