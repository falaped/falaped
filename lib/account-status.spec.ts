import assert from "node:assert/strict"
import { test } from "node:test"

import { effectiveStatus, isInTrial } from "./account-status"

const now = new Date("2026-10-01T12:00:00Z")

test("trial em andamento libera conta unpaid; vencido ou ausente não", () => {
  assert.equal(effectiveStatus("unpaid", "2026-10-10T00:00:00Z", now), "paid")
  assert.equal(effectiveStatus("unpaid", "2026-09-30T00:00:00Z", now), "unpaid")
  assert.equal(effectiveStatus("unpaid", null, now), "unpaid")
  assert.equal(isInTrial("2026-10-01T12:00:00Z", now), false)
})

test("trial não desbloqueia conta bloqueada nem mexe em quem já paga", () => {
  assert.equal(effectiveStatus("blocked", "2026-10-10T00:00:00Z", now), "blocked")
  assert.equal(effectiveStatus("paid", null, now), "paid")
  assert.equal(effectiveStatus(undefined, "2026-10-10T00:00:00Z", now), null)
})
