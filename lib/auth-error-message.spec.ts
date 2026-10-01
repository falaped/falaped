import assert from "node:assert/strict"
import { test } from "node:test"
import { AuthApiError } from "@supabase/supabase-js"

import { authErrorMessage } from "./auth-error-message"

test("erro de banco no cadastro vira mensagem de telefone já usado", () => {
  const error = new AuthApiError("Database error saving new user", 500, "unexpected_failure")
  assert.match(authErrorMessage(error), /telefone já está cadastrado/)
})

test("códigos conhecidos traduzem; desconhecidos nunca vazam o texto em inglês", () => {
  assert.equal(
    authErrorMessage(new AuthApiError("Invalid login credentials", 400, "invalid_credentials")),
    "E-mail ou senha incorretos.",
  )
  const unknown = authErrorMessage(new AuthApiError("Something weird", 500, "hook_timeout"))
  assert.doesNotMatch(unknown, /weird/)
})

test("erro nosso em PT-BR passa; falha de rede vira mensagem de conexão", () => {
  assert.equal(authErrorMessage(new Error("Telefone é obrigatório")), "Telefone é obrigatório")
  assert.match(authErrorMessage(new TypeError("Failed to fetch")), /Sem conexão/)
})
