import test from "node:test"
import assert from "node:assert/strict"

import { classifyBloodPressure } from "@/lib/bp-classification"
import {
  BP_HEIGHT_PERCENTILES,
  findBpHeightColumn,
  getBpReferenceRow,
} from "@/lib/bp-reference"

test("a tabela cobre 1 a 17 anos nos dois sexos, com 7 colunas de estatura", () => {
  for (const sex of ["masculino", "feminino"] as const) {
    for (let age = 1; age <= 17; age++) {
      const row = getBpReferenceRow(sex, age)!
      assert.ok(row, `${sex} ${age} anos sem linha`)
      for (const key of ["heightCm", "sbp50", "sbp90", "sbp95", "dbp50", "dbp90", "dbp95"] as const) {
        assert.equal(row[key].length, BP_HEIGHT_PERCENTILES.length, `${sex} ${age} ${key}`)
      }
      for (let i = 0; i < 7; i++) {
        assert.ok(row.sbp50[i] <= row.sbp90[i] && row.sbp90[i] <= row.sbp95[i])
        assert.ok(row.dbp50[i] <= row.dbp90[i] && row.dbp90[i] <= row.dbp95[i])
      }
    }
    assert.equal(getBpReferenceRow(sex, 0), null)
    assert.equal(getBpReferenceRow(sex, 18), null)
  }
})

test("a coluna escolhida é a da estatura mais próxima", () => {
  const row = getBpReferenceRow("masculino", 10)!
  assert.equal(findBpHeightColumn(row, row.heightCm[0] - 20), 0)
  assert.equal(findBpHeightColumn(row, row.heightCm[3]), 3)
  assert.equal(findBpHeightColumn(row, row.heightCm[6] + 20), 6)
})

test("menino de 8 anos: as quatro faixas nos próprios limites", () => {
  const row = getBpReferenceRow("masculino", 8)!
  const c = findBpHeightColumn(row, row.heightCm[3])
  const p90 = row.sbp90[c]
  const p95 = row.sbp95[c]
  const at = (systolic: number) =>
    classifyBloodPressure({
      ageYears: 8,
      sex: "masculino",
      heightCm: row.heightCm[3],
      systolic,
      diastolic: 50,
    }).category

  assert.equal(at(p90 - 1), "normal")
  assert.equal(at(p90), "elevada")
  assert.equal(at(p95 - 1), "elevada")
  assert.equal(at(p95), "hipertensao_estagio_1")
  assert.equal(at(p95 + 11), "hipertensao_estagio_1")
  assert.equal(at(p95 + 12), "hipertensao_estagio_2")
})

test("o teto absoluto vence quando o percentil fica acima dele", () => {
  // Aos 12 anos, na coluna de estatura mais alta, o percentil 90 de PAS passa de
  // 120 e o percentil 95 de PAD + 12 passa de 90. A regra do guideline é usar o
  // MENOR entre o percentil e o corte absoluto, então quem manda é o absoluto.
  const row = getBpReferenceRow("masculino", 12)!
  const c = 6
  assert.ok(row.sbp90[c] > 120, "premissa: percentil 90 de PAS acima de 120")
  assert.ok(row.dbp95[c] + 12 > 90, "premissa: percentil 95 de PAD + 12 acima de 90")

  const at = (systolic: number, diastolic: number) =>
    classifyBloodPressure({
      ageYears: 12,
      sex: "masculino",
      heightCm: row.heightCm[c],
      systolic,
      diastolic,
    })

  // 120 de PAS já é elevada, embora ainda esteja abaixo do percentil 90.
  assert.equal(at(120, 50).category, "elevada")
  assert.equal(at(119, 50).category, "normal")
  assert.equal(at(120, 50).basis, "percentil")

  // 90 de PAD já é estágio 2, embora ainda esteja abaixo do percentil 95 + 12.
  assert.equal(at(100, 90).category, "hipertensao_estagio_2")
  assert.equal(at(100, 89).category, "hipertensao_estagio_1")
})

test("13 anos ou mais usa corte fixo, e a diastólica sozinha sobe a faixa", () => {
  const at = (systolic: number, diastolic: number) =>
    classifyBloodPressure({
      ageYears: 14,
      sex: "feminino",
      heightCm: 160,
      systolic,
      diastolic,
    })

  assert.equal(at(119, 79).category, "normal")
  assert.equal(at(120, 79).category, "elevada")
  assert.equal(at(129, 79).category, "elevada")
  assert.equal(at(130, 79).category, "hipertensao_estagio_1")
  assert.equal(at(119, 80).category, "hipertensao_estagio_1")
  assert.equal(at(139, 89).category, "hipertensao_estagio_1")
  assert.equal(at(140, 79).category, "hipertensao_estagio_2")
  assert.equal(at(119, 90).category, "hipertensao_estagio_2")
  assert.equal(at(120, 79).basis, "corte_fixo")
})

test("sem estatura, fora da faixa etária ou abaixo de 1 ano não inventa faixa", () => {
  const base = { sex: "masculino" as const, systolic: 110, diastolic: 70 }

  assert.equal(
    classifyBloodPressure({ ...base, ageYears: 8, heightCm: null }).category,
    "sem_referencia",
  )
  assert.equal(
    classifyBloodPressure({ ...base, ageYears: 0, heightCm: 70 }).category,
    "sem_referencia",
  )
  // 13 anos sem estatura ainda classifica: o corte fixo não depende de estatura.
  assert.equal(
    classifyBloodPressure({ ...base, ageYears: 13, heightCm: null }).category,
    "normal",
  )
})
