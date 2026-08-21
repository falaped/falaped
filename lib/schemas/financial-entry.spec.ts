import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { standaloneFinancialEntrySchema } from "./financial-entry"

const VALID = {
  description: "Consulta particular sem caso",
  amount: "250,00",
  received_on: "21/08/2026",
  payment_method: "pix",
}

const firstError = (input: Record<string, unknown>) =>
  standaloneFinancialEntrySchema.safeParse(input).error?.issues[0]?.message

describe("standaloneFinancialEntrySchema", () => {
  it("aceita um avulso completo e devolve centavos inteiros e data ISO", () => {
    const parsed = standaloneFinancialEntrySchema.safeParse(VALID)
    assert.equal(parsed.success, true)
    assert.equal(parsed.data?.amount, 25000)
    assert.equal(parsed.data?.received_on, "2026-08-21")
  })

  it("aceita um centavo (boundary de EARN-02)", () => {
    const parsed = standaloneFinancialEntrySchema.safeParse({ ...VALID, amount: "0,01" })
    assert.equal(parsed.data?.amount, 1)
  })

  it("aceita descrição de um caractere e preserva acentos", () => {
    assert.equal(
      standaloneFinancialEntrySchema.safeParse({ ...VALID, description: "x" }).success,
      true,
    )
    const acentos = "Consulta domiciliar — avaliação de icterícia neonatal"
    assert.equal(
      standaloneFinancialEntrySchema.safeParse({ ...VALID, description: acentos }).data
        ?.description,
      acentos,
    )
  })

  it("rejeita zero com a mensagem de cortesia", () => {
    assert.equal(
      firstError({ ...VALID, amount: "0,00" }),
      "O valor deve ser maior que zero. Para cortesia, encerre o caso sem lançar.",
    )
  })

  it("rejeita valor vazio", () => {
    assert.equal(firstError({ ...VALID, amount: "" }), "Informe o valor.")
  })

  it("rejeita valor inparseável", () => {
    assert.equal(
      firstError({ ...VALID, amount: "abc" }),
      "Valor inválido. Use apenas números, ex.: 250,00.",
    )
  })

  it("rejeita descrição só de espaços", () => {
    assert.equal(firstError({ ...VALID, description: "   " }), "Descreva o lançamento.")
  })

  it("rejeita data vazia, incompleta e impossível", () => {
    for (const received_on of ["", "21/08", "31/02/2026"]) {
      assert.equal(
        firstError({ ...VALID, received_on }),
        "Informe a data no formato dd/mm/aaaa.",
      )
    }
  })

  it("rejeita forma de pagamento ausente", () => {
    assert.equal(
      firstError({ ...VALID, payment_method: undefined }),
      "Selecione a forma de pagamento.",
    )
  })

  it("aceita um colar com prefixo de moeda", () => {
    assert.equal(
      standaloneFinancialEntrySchema.safeParse({ ...VALID, amount: "R$ 1.500,50" }).data
        ?.amount,
      150050,
    )
  })
})
