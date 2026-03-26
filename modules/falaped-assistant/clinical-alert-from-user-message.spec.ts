import test from "node:test"
import assert from "node:assert/strict"
import {
  buildClinicalAlertItemsFromUserMessage,
  hasExplicitGuardianQuotedOrShoutSignal,
} from "@/modules/falaped-assistant/clinical-alert-from-user-message"

test("buildClinicalAlertItemsFromUserMessage returns empty for plain text", () => {
  assert.equal(buildClinicalAlertItemsFromUserMessage("peso 5kg").length, 0)
})

test("buildClinicalAlertItemsFromUserMessage detects urgency language", () => {
  const items = buildClinicalAlertItemsFromUserMessage("urgência pediatrica, encaminhamento imediato")
  assert.ok(items.length >= 1)
  assert.ok(items.some((item) => item.id === "explicit_clinical_alert_language"))
})

test("buildClinicalAlertItemsFromUserMessage detects tiragem", () => {
  const items = buildClinicalAlertItemsFromUserMessage("tiragem intercostal moderada")
  assert.ok(items.some((item) => item.id === "respiratory_work_of_breathing"))
})

test("buildClinicalAlertItemsFromUserMessage detects high FR", () => {
  const items = buildClinicalAlertItemsFromUserMessage("FR de 60 irpm")
  assert.ok(items.some((item) => item.id === "tachypnea_documented"))
})

test("buildClinicalAlertItemsFromUserMessage detects low SpO2", () => {
  const items = buildClinicalAlertItemsFromUserMessage("SatO2 de 90%")
  assert.ok(items.some((item) => item.id === "hypoxemia_documented"))
})

test("buildClinicalAlertItemsFromUserMessage detects cyanosis", () => {
  const items = buildClinicalAlertItemsFromUserMessage("cianose periférica")
  assert.ok(items.some((item) => item.id === "cyanosis"))
})

test("buildClinicalAlertItemsFromUserMessage excludes negated cyanosis", () => {
  const items = buildClinicalAlertItemsFromUserMessage("sem cianose")
  assert.ok(!items.some((item) => item.id === "cyanosis"))
})

test("buildClinicalAlertItemsFromUserMessage detects apnea", () => {
  const items = buildClinicalAlertItemsFromUserMessage("apresentou apneia durante avaliação")
  assert.ok(items.some((item) => item.id === "apnea_or_respiratory_pause"))
})

test("buildClinicalAlertItemsFromUserMessage excludes negated apnea", () => {
  const items = buildClinicalAlertItemsFromUserMessage("sem apneia")
  assert.ok(!items.some((item) => item.id === "apnea_or_respiratory_pause"))
})

test("buildClinicalAlertItemsFromUserMessage returns empty for empty input", () => {
  assert.equal(buildClinicalAlertItemsFromUserMessage("").length, 0)
})

test("hasExplicitGuardianQuotedOrShoutSignal detects guardian cue", () => {
  assert.equal(hasExplicitGuardianQuotedOrShoutSignal("queixa da mãe: febre alta"), true)
  assert.equal(hasExplicitGuardianQuotedOrShoutSignal("mãe disse que não mamou"), true)
})

test("hasExplicitGuardianQuotedOrShoutSignal detects shout signal", () => {
  assert.equal(hasExplicitGuardianQuotedOrShoutSignal("FEBRE ALTA HÁ DOIS DIAS SEM MELHORA"), true)
})

test("hasExplicitGuardianQuotedOrShoutSignal returns false for clinical dictation", () => {
  assert.equal(hasExplicitGuardianQuotedOrShoutSignal("peso 5kg altura 51cm"), false)
})
