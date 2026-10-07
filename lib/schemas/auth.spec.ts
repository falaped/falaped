import { test } from "node:test"
import assert from "node:assert/strict"

import { normalizeCrm, signUpSchema } from "./auth"

const crmOk = (crm: string) => signUpSchema.shape.crm.safeParse(crm).success

test("CRM e UF aceita as formas comuns e normaliza para o formato do Perfil", () => {
  for (const [input, out] of [["12345 MG", "12345 MG"], ["12345/mg", "12345 MG"], ["123456-sp", "123456 SP"], [" 1234MG ", "1234 MG"]]) {
    assert.ok(crmOk(input), input)
    assert.equal(normalizeCrm(input), out)
  }
})

test("CRM sem UF ou com texto solto é recusado", () => {
  for (const input of ["", "12345", "MG", "CRM 12345 MG", "12345 MGG"]) assert.ok(!crmOk(input), input)
})
