import test from "node:test"
import assert from "node:assert/strict"

import {
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
