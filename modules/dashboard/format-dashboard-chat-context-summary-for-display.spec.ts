import test from "node:test"
import assert from "node:assert/strict"

import {
  containsFalapedJsonMarker,
  formatDashboardChatContextSummaryForDisplay,
  stripFalapedJsonFromSummaryText,
} from "@/modules/dashboard/format-dashboard-chat-context-summary-for-display"

test("stripFalapedJsonFromSummaryText expands assistant_reply payload", () => {
  const json = JSON.stringify({
    type: "assistant_reply",
    content: "Exames laboratoriais registrados no caso.",
    showAlertCompact: false,
  })
  const raw = `Médico: Olá | Falaped: __FALAPED_JSON__${json} | Médico: Obrigado`
  const out = stripFalapedJsonFromSummaryText(raw)
  assert.ok(out.includes("Exames laboratoriais registrados no caso."))
  assert.ok(!out.includes("__FALAPED_JSON__"))
})

test("stripFalapedJsonFromSummaryText drops truncated JSON without leaking prefix", () => {
  const raw =
    "Antes __FALAPED_JSON__{\"type\":\"assistant_reply\",\"content\":\"X\" depois"
  const out = stripFalapedJsonFromSummaryText(raw)
  assert.ok(!out.includes("__FALAPED_JSON__"))
  assert.ok(out.includes("Antes"))
})

test("stripFalapedJsonFromSummaryText skips orphan prefix without brace", () => {
  const raw = "A __FALAPED_JSON__ B"
  const out = stripFalapedJsonFromSummaryText(raw)
  assert.equal(out, "A  B")
})

test("formatDashboardChatContextSummaryForDisplay strips orphan prefix and keeps surrounding text", () => {
  const raw = "texto __FALAPED_JSON__ resto sem json válido"
  const formatted = formatDashboardChatContextSummaryForDisplay(raw)
  assert.ok(formatted != null)
  assert.ok(!formatted.includes("__FALAPED_JSON__"))
})

test("formatDashboardChatContextSummaryForDisplay returns null when nothing readable remains", () => {
  assert.equal(
    formatDashboardChatContextSummaryForDisplay(
      "__FALAPED_JSON__ __FALAPED_JSON__",
    ),
    null,
  )
})

test("formatDashboardChatContextSummaryForDisplay joins pipe segments with blank lines", () => {
  const formatted = formatDashboardChatContextSummaryForDisplay(
    "Médico: A | Falaped: B",
  )
  assert.equal(formatted, "Médico: A\n\nFalaped: B")
})

test("formatDashboardChatContextSummaryForDisplay returns null for empty", () => {
  assert.equal(formatDashboardChatContextSummaryForDisplay(null), null)
  assert.equal(formatDashboardChatContextSummaryForDisplay("   "), null)
})

test("containsFalapedJsonMarker detects prefix", () => {
  assert.equal(containsFalapedJsonMarker("ok"), false)
  assert.equal(containsFalapedJsonMarker("__FALAPED_JSON__"), true)
})
