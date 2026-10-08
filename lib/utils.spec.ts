import assert from "node:assert/strict"
import { test } from "node:test"

import { cn } from "./utils"

test("cn mantém a cor ao lado de um tamanho da escala do guia", () => {
  assert.equal(cn("text-subtle-foreground", "text-caption"), "text-subtle-foreground text-caption")
})

test("cn troca um tamanho pelo outro", () => {
  assert.equal(cn("text-sm text-primary-foreground", "text-label"), "text-primary-foreground text-label")
})
