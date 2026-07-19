import test from "node:test"
import assert from "node:assert/strict"

import {
  computeBandStatus,
  countTaken,
  type BandStatus,
} from "@/lib/vaccine-band-status"

test("computeBandStatus: empty item list → 'none'", () => {
  const status: BandStatus = computeBandStatus([], new Set())
  assert.equal(status, "none")
})

test("computeBandStatus: no items taken → 'empty'", () => {
  assert.equal(computeBandStatus(["a", "b", "c"], new Set()), "empty")
})

test("computeBandStatus: some (not all) taken → 'partial'", () => {
  assert.equal(computeBandStatus(["a", "b", "c"], new Set(["a"])), "partial")
  assert.equal(
    computeBandStatus(["a", "b", "c"], new Set(["a", "b"])),
    "partial",
  )
})

test("computeBandStatus: all taken → 'done'", () => {
  assert.equal(
    computeBandStatus(["a", "b", "c"], new Set(["a", "b", "c"])),
    "done",
  )
})

test("computeBandStatus: ignores taken ids not in the band", () => {
  // 'z' is taken but not part of the band → still 'empty' since none of a/b are taken.
  assert.equal(computeBandStatus(["a", "b"], new Set(["z"])), "empty")
  // Only 'a' of the band is taken (plus unrelated 'z') → 'partial'.
  assert.equal(computeBandStatus(["a", "b"], new Set(["a", "z"])), "partial")
})

test("countTaken: counts only band ids present in the taken set", () => {
  assert.equal(countTaken([], new Set()), 0)
  assert.equal(countTaken(["a", "b", "c"], new Set(["a", "c", "z"])), 2)
  assert.equal(countTaken(["a", "b"], new Set(["a", "b"])), 2)
  assert.equal(countTaken(["a", "b"], new Set(["z"])), 0)
})
