import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { formatCentsToInputValue, parseBrlToCents } from "./money"
import { formatCentsToBRL } from "./formatters"

/** Normaliza espaços exóticos (o Intl usa espaço não-separável entre R$ e o número). */
const norm = (value: string) => value.replace(/\s/g, " ")

describe("parseBrlToCents", () => {
  it("aceita inteiro sem separador decimal", () => {
    assert.equal(parseBrlToCents("250"), 25000)
  })

  it("aceita vírgula decimal", () => {
    assert.equal(parseBrlToCents("250,00"), 25000)
  })

  it("aceita ponto de milhar com vírgula decimal", () => {
    assert.equal(parseBrlToCents("1.500,50"), 150050)
  })

  it("aceita um centavo", () => {
    assert.equal(parseBrlToCents("0,01"), 1)
  })

  it("arredonda o produto em ponto flutuante (150.05 * 100 = 15005.000000000002)", () => {
    assert.equal(parseBrlToCents("150.05"), 15005)
  })

  it("sobrevive a um colar com prefixo de moeda", () => {
    assert.equal(parseBrlToCents("R$ 1.500,50"), 150050)
  })

  it("sobrevive a espaços nas pontas", () => {
    assert.equal(parseBrlToCents(" 250 "), 25000)
  })

  it("devolve null para texto", () => {
    assert.equal(parseBrlToCents("abc"), null)
  })

  it("devolve null para string vazia", () => {
    assert.equal(parseBrlToCents(""), null)
  })

  it("devolve null para valor negativo", () => {
    assert.equal(parseBrlToCents("-5"), null)
  })

  it("trata ponto como decimal quando não há vírgula", () => {
    assert.equal(parseBrlToCents("1500.50"), 150050)
  })

  it("trata ponto como milhar quando é o padrão brasileiro sem decimal", () => {
    assert.equal(parseBrlToCents("1.500"), 150000)
  })

  it("devolve null para espaço não-separável sozinho", () => {
    assert.equal(parseBrlToCents(" "), null)
  })
})

describe("formatCentsToBRL", () => {
  it("formata centavos como moeda brasileira", () => {
    assert.equal(norm(formatCentsToBRL(15000)), "R$ 150,00")
  })

  it("formata um centavo, nunca zero", () => {
    assert.equal(norm(formatCentsToBRL(1)), "R$ 0,01")
  })

  it("usa separador de milhar e nunca abrevia", () => {
    assert.equal(norm(formatCentsToBRL(14532000)), "R$ 145.320,00")
  })
})

it("formatCentsToInputValue: centavos viram o decimal PT-BR do input, sem prefixo", () => {
  assert.equal(formatCentsToInputValue(25000), "250,00")
  assert.equal(formatCentsToInputValue(150050), "1.500,50")
  assert.equal(formatCentsToInputValue(0), "0,00")
})

it("formatCentsToInputValue: nulo abre o campo VAZIO, nunca com zero", () => {
  assert.equal(formatCentsToInputValue(null), "")
  assert.equal(formatCentsToInputValue(undefined), "")
})

it("formatCentsToInputValue -> parseBrlToCents é ida e volta", () => {
  for (const cents of [0, 1, 25000, 150050, 1234567]) {
    assert.equal(parseBrlToCents(formatCentsToInputValue(cents)), cents)
  }
})
