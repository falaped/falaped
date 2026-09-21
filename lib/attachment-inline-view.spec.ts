import test from "node:test"
import assert from "node:assert/strict"

import { isInlineViewableMimeType } from "@/lib/attachment-inline-view"

test("PDF e imagens de raster abrem inline", () => {
  assert.equal(isInlineViewableMimeType("application/pdf"), true)
  assert.equal(isInlineViewableMimeType("image/png"), true)
  assert.equal(isInlineViewableMimeType("image/jpeg"), true)
  assert.equal(isInlineViewableMimeType("IMAGE/JPEG"), true)
  assert.equal(isInlineViewableMimeType("application/pdf; charset=binary"), true)
})

test("HTML, SVG e qualquer tipo executável NÃO abrem inline", () => {
  assert.equal(isInlineViewableMimeType("text/html"), false)
  assert.equal(isInlineViewableMimeType("image/svg+xml"), false)
  assert.equal(isInlineViewableMimeType("application/xhtml+xml"), false)
  assert.equal(isInlineViewableMimeType("text/javascript"), false)
})

test("tipo ausente ou desconhecido cai para download", () => {
  assert.equal(isInlineViewableMimeType(null), false)
  assert.equal(isInlineViewableMimeType(undefined), false)
  assert.equal(isInlineViewableMimeType(""), false)
  assert.equal(isInlineViewableMimeType("application/octet-stream"), false)
  assert.equal(
    isInlineViewableMimeType(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    false,
  )
})
