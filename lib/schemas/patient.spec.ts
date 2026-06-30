import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { createPatientSchema, updatePatientSchema } from "./patient"

const baseCreate = {
  name: "João Silva",
  birth_date: "02/05/2023",
  responsible: "Maria Silva",
  contact_phone: "11999999999",
  sex: "masculino",
}

describe("createPatientSchema gestational_age_weeks", () => {
  it("coerces a valid in-range string to a number", () => {
    const parsed = createPatientSchema.safeParse({
      ...baseCreate,
      gestational_age_weeks: "34",
    })
    assert.equal(parsed.success, true)
    if (parsed.success) {
      assert.equal(parsed.data.gestational_age_weeks, 34)
    }
  })

  it("treats empty string as undefined (optional, no error)", () => {
    const parsed = createPatientSchema.safeParse({
      ...baseCreate,
      gestational_age_weeks: "",
    })
    assert.equal(parsed.success, true)
    if (parsed.success) {
      assert.equal(parsed.data.gestational_age_weeks, undefined)
    }
  })

  it("treats a missing field as undefined (optional)", () => {
    const parsed = createPatientSchema.safeParse(baseCreate)
    assert.equal(parsed.success, true)
    if (parsed.success) {
      assert.equal(parsed.data.gestational_age_weeks, undefined)
    }
  })

  it("rejects a value below 20 with the PT-BR message", () => {
    const parsed = createPatientSchema.safeParse({
      ...baseCreate,
      gestational_age_weeks: "19",
    })
    assert.equal(parsed.success, false)
    if (!parsed.success) {
      assert.equal(
        parsed.error.issues.some(
          (i) => i.message === "Informe um valor entre 20 e 42 semanas.",
        ),
        true,
      )
    }
  })

  it("rejects a value above 42 with the PT-BR message", () => {
    const parsed = createPatientSchema.safeParse({
      ...baseCreate,
      gestational_age_weeks: "43",
    })
    assert.equal(parsed.success, false)
    if (!parsed.success) {
      assert.equal(
        parsed.error.issues.some(
          (i) => i.message === "Informe um valor entre 20 e 42 semanas.",
        ),
        true,
      )
    }
  })

  it("accepts the inclusive bounds 20 and 42", () => {
    for (const weeks of ["20", "42"]) {
      const parsed = createPatientSchema.safeParse({
        ...baseCreate,
        gestational_age_weeks: weeks,
      })
      assert.equal(parsed.success, true)
      if (parsed.success) {
        assert.equal(parsed.data.gestational_age_weeks, Number(weeks))
      }
    }
  })
})

describe("updatePatientSchema gestational_age_weeks", () => {
  it("coerces a valid string to a number", () => {
    const parsed = updatePatientSchema.safeParse({
      birth_date: "",
      sex: "",
      gestational_age_weeks: "32",
    })
    assert.equal(parsed.success, true)
    if (parsed.success) {
      assert.equal(parsed.data.gestational_age_weeks, 32)
    }
  })

  it("treats empty string as undefined (clears optional)", () => {
    const parsed = updatePatientSchema.safeParse({
      birth_date: "",
      sex: "",
      gestational_age_weeks: "",
    })
    assert.equal(parsed.success, true)
    if (parsed.success) {
      assert.equal(parsed.data.gestational_age_weeks, undefined)
    }
  })

  it("rejects out-of-range values with the PT-BR message", () => {
    const parsed = updatePatientSchema.safeParse({
      birth_date: "",
      sex: "",
      gestational_age_weeks: "10",
    })
    assert.equal(parsed.success, false)
    if (!parsed.success) {
      assert.equal(
        parsed.error.issues.some(
          (i) => i.message === "Informe um valor entre 20 e 42 semanas.",
        ),
        true,
      )
    }
  })
})
