import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  isCompleteBirthDateInputString,
  isCompleteBrazilianDateString,
  maskBrazilianDateInput,
  parseBirthDateFormValueToIso,
  parseBrazilianDateStringToIso,
} from "./brazilian-date-form"

describe("parseBrazilianDateStringToIso", () => {
  it("returns ISO for valid date", () => {
    assert.equal(parseBrazilianDateStringToIso("23/02/2026"), "2026-02-23")
  })

  it("returns null for invalid calendar date", () => {
    assert.equal(parseBrazilianDateStringToIso("31/02/2026"), null)
  })

  it("returns null for malformed string", () => {
    assert.equal(parseBrazilianDateStringToIso("2026-02-23"), null)
    assert.equal(parseBrazilianDateStringToIso("23-02-2026"), null)
    assert.equal(parseBrazilianDateStringToIso("32/01/2026"), null)
  })

  it("trims whitespace", () => {
    assert.equal(parseBrazilianDateStringToIso("  01/01/2020  "), "2020-01-01")
  })

  it("returns null for empty", () => {
    assert.equal(parseBrazilianDateStringToIso(""), null)
    assert.equal(parseBrazilianDateStringToIso("   "), null)
  })
})

describe("parseBirthDateFormValueToIso", () => {
  it("accepts Brazilian and ISO date-only strings", () => {
    assert.equal(parseBirthDateFormValueToIso("18/11/2025"), "2025-11-18")
    assert.equal(parseBirthDateFormValueToIso("2025-11-18"), "2025-11-18")
  })

  it("returns null for incomplete or invalid", () => {
    assert.equal(parseBirthDateFormValueToIso("18/11/202"), null)
    assert.equal(parseBirthDateFormValueToIso("2025-13-01"), null)
    assert.equal(parseBirthDateFormValueToIso("not-a-date"), null)
  })
})

describe("isCompleteBirthDateInputString", () => {
  it("accepts ISO yyyy-mm-dd", () => {
    assert.equal(isCompleteBirthDateInputString("2025-11-18"), true)
  })
})

describe("isCompleteBrazilianDateString", () => {
  it("is true only for dd/mm/aaaa with four-digit year", () => {
    assert.equal(isCompleteBrazilianDateString("18/11/2024"), true)
    assert.equal(isCompleteBrazilianDateString(" 18/11/2024 "), true)
    assert.equal(isCompleteBrazilianDateString("18/11/202"), false)
    assert.equal(isCompleteBrazilianDateString(""), false)
    assert.equal(isCompleteBrazilianDateString("18/11/24"), false)
  })
})

describe("maskBrazilianDateInput", () => {
  it("inserts slashes progressively", () => {
    assert.equal(maskBrazilianDateInput("2"), "2")
    assert.equal(maskBrazilianDateInput("23"), "23")
    assert.equal(maskBrazilianDateInput("230"), "23/0")
    assert.equal(maskBrazilianDateInput("2302"), "23/02")
    assert.equal(maskBrazilianDateInput("23022"), "23/02/2")
    assert.equal(maskBrazilianDateInput("23022026"), "23/02/2026")
  })

  it("strips non-digits and caps length", () => {
    assert.equal(maskBrazilianDateInput("23/02/2026x"), "23/02/2026")
    assert.equal(maskBrazilianDateInput("12345678901"), "12/34/5678")
  })
})
