import test from "node:test"
import assert from "node:assert/strict"

import { computeElapsedMs } from "@/lib/compute-elapsed-ms"

const MIN = 60_000

test("running: elapsed = now - startedAt (pausedMs 0)", () => {
  const now = Date.parse("2026-06-28T12:10:00.000Z")
  const startedAt = "2026-06-28T12:00:00.000Z"
  const elapsed = computeElapsedMs(
    { startedAt, endedAt: null, pausedMs: 0, pausedAt: null },
    now,
  )
  assert.equal(elapsed, 10 * MIN)
})

test("paused: elapsed frozen at pausedAt - startedAt, does not grow with now", () => {
  const startedAt = "2026-06-28T12:00:00.000Z"
  const pausedAt = "2026-06-28T12:05:00.000Z"
  const earlier = Date.parse("2026-06-28T12:06:00.000Z")
  const later = Date.parse("2026-06-28T12:30:00.000Z")
  const opts = { startedAt, endedAt: null, pausedMs: 0, pausedAt }
  assert.equal(computeElapsedMs(opts, earlier), 5 * MIN)
  assert.equal(computeElapsedMs(opts, later), 5 * MIN)
})

test("ended: elapsed = endedAt - startedAt - pausedMs (final, independent of now)", () => {
  const startedAt = "2026-06-28T12:00:00.000Z"
  const endedAt = "2026-06-28T12:20:00.000Z"
  const now = Date.parse("2026-06-28T13:00:00.000Z")
  const elapsed = computeElapsedMs(
    { startedAt, endedAt, pausedMs: 2 * MIN, pausedAt: null },
    now,
  )
  assert.equal(elapsed, 18 * MIN)
})

test("reload simulation: running grows by delta when now advances", () => {
  const startedAt = "2026-06-28T12:00:00.000Z"
  const opts = { startedAt, endedAt: null, pausedMs: 0, pausedAt: null }
  const first = computeElapsedMs(opts, Date.parse("2026-06-28T12:05:00.000Z"))
  const second = computeElapsedMs(opts, Date.parse("2026-06-28T12:08:00.000Z"))
  assert.equal(first, 5 * MIN)
  assert.equal(second, 8 * MIN)
})

test("reload simulation: paused unchanged regardless of now", () => {
  const startedAt = "2026-06-28T12:00:00.000Z"
  const pausedAt = "2026-06-28T12:04:00.000Z"
  const opts = { startedAt, endedAt: null, pausedMs: 0, pausedAt }
  const before = computeElapsedMs(opts, Date.parse("2026-06-28T12:05:00.000Z"))
  const after = computeElapsedMs(opts, Date.parse("2026-06-28T13:00:00.000Z"))
  assert.equal(before, 4 * MIN)
  assert.equal(after, 4 * MIN)
})

test("accumulator: started 20min ago, pausedMs 5min, running -> ~15min", () => {
  const now = Date.parse("2026-06-28T12:20:00.000Z")
  const startedAt = "2026-06-28T12:00:00.000Z"
  const elapsed = computeElapsedMs(
    { startedAt, endedAt: null, pausedMs: 5 * MIN, pausedAt: null },
    now,
  )
  assert.equal(elapsed, 15 * MIN)
})

test("never negative: clamps at 0 when pausedMs exceeds wall time", () => {
  const now = Date.parse("2026-06-28T12:01:00.000Z")
  const startedAt = "2026-06-28T12:00:00.000Z"
  const elapsed = computeElapsedMs(
    { startedAt, endedAt: null, pausedMs: 10 * MIN, pausedAt: null },
    now,
  )
  assert.equal(elapsed, 0)
})
