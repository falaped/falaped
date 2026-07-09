import test from "node:test"
import assert from "node:assert/strict"

import {
  lmsValueAtZ,
  lmsZScore,
  percentileFromZ,
  PERCENTILE_Z_MAP,
  type Lms,
} from "@/lib/lms-zscore"

// Real WHO Child Growth Standards LMS rows (from the official z-score tables).
// These are load-bearing cross-checks: if the ingested LMS or the math were wrong,
// reproducing WHO's own published z-score/percentile values would fail.
const WFA_BOYS_M0: Lms = { L: 0.3487, M: 3.3464, S: 0.14602 }
const WFA_BOYS_M12: Lms = { L: 0.0644, M: 9.6479, S: 0.10925 }
const HCFA_BOYS_M0: Lms = { L: 1, M: 34.4618, S: 0.03686 } // L === 1 (non-log, linear-ish branch)

test("lmsValueAtZ(0) === M (P50 is the median, structural)", () => {
  assert.equal(lmsValueAtZ(0, WFA_BOYS_M0), WFA_BOYS_M0.M)
  assert.equal(lmsValueAtZ(0, HCFA_BOYS_M0), HCFA_BOYS_M0.M)
})

test("lmsZScore(M) === 0", () => {
  assert.equal(lmsZScore(WFA_BOYS_M0.M, WFA_BOYS_M0), 0)
  assert.equal(lmsZScore(WFA_BOYS_M12.M, WFA_BOYS_M12), 0)
})

test("lmsZScore uses the log branch when L === 0", () => {
  const lms: Lms = { L: 0, M: 10, S: 0.1 }
  assert.equal(lmsZScore(lms.M, lms), 0)
  // At L=0: z = ln(x/M)/S. For x = M*e^(S) → z = 1.
  const x = lms.M * Math.exp(lms.S)
  assert.ok(Math.abs(lmsZScore(x, lms) - 1) < 1e-12)
  assert.ok(Math.abs(lmsValueAtZ(1, lms) - x) < 1e-9)
})

test("lmsValueAtZ ↔ lmsZScore are inverses", () => {
  for (const z of [-3, -1.881, -1, 0, 1, 1.881, 3]) {
    const x = lmsValueAtZ(z, WFA_BOYS_M12)
    assert.ok(Math.abs(lmsZScore(x, WFA_BOYS_M12) - z) < 1e-9)
  }
})

// CROSS-CHECK vs WHO's published z-score table (weight-for-age BOYS, birth = month 0):
// SD3neg=2.1, SD2neg=2.5, SD0=3.3, SD2=4.4, SD3=5.0 kg (values rounded to 1 dp by WHO).
test("reproduces WHO published z-score (SD) lines for wfa boys month 0 within rounding", () => {
  assert.ok(Math.abs(lmsValueAtZ(-3, WFA_BOYS_M0) - 2.1) < 0.05)
  assert.ok(Math.abs(lmsValueAtZ(-2, WFA_BOYS_M0) - 2.5) < 0.05)
  assert.ok(Math.abs(lmsValueAtZ(0, WFA_BOYS_M0) - 3.3) < 0.05)
  assert.ok(Math.abs(lmsValueAtZ(2, WFA_BOYS_M0) - 4.4) < 0.05)
  assert.ok(Math.abs(lmsValueAtZ(3, WFA_BOYS_M0) - 5.0) < 0.05)
})

// CROSS-CHECK vs WHO's published PERCENTILE table (weight-for-age BOYS):
// month 0:  P3=2.5, P50=3.3, P97=4.3 kg.   month 12: P3=7.8, P50=9.6, P97=11.8 kg.
// P3 ≡ z=-1.8808, P97 ≡ z=+1.8808 (WHO's own percentile↔z convention).
const P3_Z = -1.8807936081512509
const P97_Z = 1.8807936081512509
test("reproduces WHO published P3/P50/P97 percentile lines within rounding", () => {
  assert.ok(Math.abs(lmsValueAtZ(P3_Z, WFA_BOYS_M0) - 2.5) < 0.05, "wfa boys m0 P3")
  assert.ok(Math.abs(lmsValueAtZ(0, WFA_BOYS_M0) - 3.3) < 0.05, "wfa boys m0 P50")
  assert.ok(Math.abs(lmsValueAtZ(P97_Z, WFA_BOYS_M0) - 4.3) < 0.05, "wfa boys m0 P97")

  assert.ok(Math.abs(lmsValueAtZ(P3_Z, WFA_BOYS_M12) - 7.8) < 0.05, "wfa boys m12 P3")
  assert.ok(Math.abs(lmsValueAtZ(0, WFA_BOYS_M12) - 9.6) < 0.05, "wfa boys m12 P50")
  assert.ok(Math.abs(lmsValueAtZ(P97_Z, WFA_BOYS_M12) - 11.8) < 0.05, "wfa boys m12 P97")
})

test("percentileFromZ maps the standard-normal landmarks", () => {
  assert.ok(Math.abs(percentileFromZ(0) - 50) < 1e-6)
  assert.ok(Math.abs(percentileFromZ(P3_Z) - 3) < 0.05)
  assert.ok(Math.abs(percentileFromZ(P97_Z) - 97) < 0.05)
  assert.ok(Math.abs(percentileFromZ(-1.6448536) - 5) < 0.05)
})

test("PERCENTILE_Z_MAP z-values round-trip through percentileFromZ", () => {
  for (const { percentile, z } of PERCENTILE_Z_MAP) {
    assert.ok(Math.abs(percentileFromZ(z) - percentile) < 0.05, `P${percentile}`)
  }
})
