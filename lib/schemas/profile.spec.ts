import test from "node:test"
import assert from "node:assert/strict"

import { updateProfileSchema } from "@/lib/schemas/profile"

/**
 * O campo `consultation_price_cents` do Perfil (EARN-01) é um campo de FORMULÁRIO:
 * o form manda string, o schema devolve centavos inteiros. As mensagens são as do
 * contrato de moeda do UI-SPEC, com a assimetria do catálogo: zero É aceito (é um
 * preço, não um lançamento) e só o negativo é rejeitado.
 *
 * O caso "vazio vira undefined" é o que garante que limpar o campo grava NULO e
 * nunca zero — um zero pré-preenchido é submetido por inércia.
 */

/** Valores de form completos (todos string vazia), com o campo em teste sobrescrito. */
function formValues(consultation_price_cents: string) {
  return {
    first_name: "",
    surname: "",
    email: "",
    crm: "",
    rqe: "",
    social_media_handle: "",
    website: "",
    report_template_id: "",
    default_location_state: "",
    default_location_city: "",
    consultation_price_cents,
  }
}

function parse(raw: string) {
  return updateProfileSchema.safeParse(formValues(raw))
}

test("consultation_price_cents: 250,00 vira 25000 centavos", () => {
  const result = parse("250,00")
  assert.ok(result.success, "250,00 deve passar")
  assert.equal(result.data.consultation_price_cents, 25000)
})

test("consultation_price_cents: campo vazio vira undefined (grava nulo, nunca zero)", () => {
  const result = parse("")
  assert.ok(result.success, "campo vazio deve passar")
  assert.equal(result.data.consultation_price_cents, undefined)
})

test("consultation_price_cents: zero é aceito (é um preço, não um lançamento)", () => {
  const result = parse("0,00")
  assert.ok(result.success, "0,00 deve passar")
  assert.equal(result.data.consultation_price_cents, 0)
})

test("consultation_price_cents: negativo é rejeitado com a mensagem de preço", () => {
  const result = parse("-5")
  assert.ok(!result.success, "-5 deve reprovar")
  assert.equal(
    result.error.issues[0]?.message,
    "O preço não pode ser negativo.",
  )
})

test("consultation_price_cents: texto inparseável é rejeitado", () => {
  const result = parse("abc")
  assert.ok(!result.success, "abc deve reprovar")
  assert.equal(
    result.error.issues[0]?.message,
    "Valor inválido. Use apenas números, ex.: 250,00.",
  )
})

test("consultation_price_cents: R$ 1.500,50 colado vira 150050 centavos", () => {
  const result = parse("R$ 1.500,50")
  assert.ok(result.success, "valor colado deve passar")
  assert.equal(result.data.consultation_price_cents, 150050)
})
