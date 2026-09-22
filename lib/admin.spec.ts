import assert from "node:assert/strict"
import { test } from "node:test"

import { isAdminEmail } from "./admin"

test("isAdminEmail só aceita as contas do time, em qualquer caixa", () => {
  assert.equal(isAdminEmail("oi.fprado@gmail.com"), true)
  assert.equal(isAdminEmail("Contato@Falaped.com.br"), true)
  assert.equal(isAdminEmail("pediatra@gmail.com"), false)
  // Nem string vazia, nem ausência de e-mail no usuário logado, passam pelo gate.
  assert.equal(isAdminEmail(""), false)
  assert.equal(isAdminEmail(null), false)
  assert.equal(isAdminEmail(undefined), false)
})
