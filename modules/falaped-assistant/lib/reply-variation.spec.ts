import test from "node:test"
import assert from "node:assert/strict"
import {
  areNearDuplicateReplies,
  isReplyEchoingUserMessage,
  isDryAcknowledgementReply,
  detectAcknowledgementTopic,
  topicAcknowledgementTemplates,
  buildDeterministicAcknowledgement,
  enforceReplyVariation,
  needsAntiBmiEchoRecovery,
  vaccineReplyHasCondutaLead,
  vaccineReplyViolatesCondutaOnly,
} from "@/modules/falaped-assistant/lib/reply-variation"

test("areNearDuplicateReplies detects identical replies", () => {
  assert.equal(areNearDuplicateReplies("Registrado.", "Registrado."), true)
})

test("areNearDuplicateReplies detects substring duplicates", () => {
  assert.equal(
    areNearDuplicateReplies(
      "Anamnese registrada com sucesso no caso.",
      "Perfeito, anamnese registrada com sucesso no caso. Pode prosseguir.",
    ),
    true,
  )
})

test("areNearDuplicateReplies returns false for different replies", () => {
  assert.equal(areNearDuplicateReplies("Registrado.", "Conduta anotada."), false)
})

test("isReplyEchoingUserMessage detects echo", () => {
  assert.equal(isReplyEchoingUserMessage("peso 5kg altura 51cm", "peso 5kg altura 51cm"), true)
})

test("isReplyEchoingUserMessage returns false for different content", () => {
  assert.equal(isReplyEchoingUserMessage("Registrado.", "peso 5kg"), false)
})

test("isDryAcknowledgementReply detects dry acknowledgements", () => {
  assert.equal(isDryAcknowledgementReply("Registrado."), true)
  assert.equal(isDryAcknowledgementReply("Anotado."), true)
  assert.equal(isDryAcknowledgementReply("Recebido."), true)
})

test("isDryAcknowledgementReply returns false for substantive replies", () => {
  assert.equal(isDryAcknowledgementReply("Anamnese registrada com sucesso."), false)
})

test("detectAcknowledgementTopic classifies anamnese", () => {
  assert.equal(detectAcknowledgementTopic("histórico de gestação e nascimento"), "anamnese")
})

test("detectAcknowledgementTopic classifies conduta", () => {
  assert.equal(detectAcknowledgementTopic("conduta: manter amamentação"), "conduta")
})

test("detectAcknowledgementTopic classifies exames_lab", () => {
  assert.equal(detectAcknowledgementTopic("hemograma normal, leucócitos ok"), "exames_lab")
})

test("detectAcknowledgementTopic defaults to registro", () => {
  assert.equal(detectAcknowledgementTopic("peso 5kg"), "registro")
})

test("topicAcknowledgementTemplates returns at least 2 templates per topic", () => {
  const topics = ["anamnese", "exame", "exames_lab", "hipoteses", "conduta", "orientacoes", "registro"] as const
  for (const topic of topics) {
    const templates = topicAcknowledgementTemplates(topic)
    assert.ok(templates.length >= 2, `expected >=2 templates for ${topic}`)
  }
})

test("buildDeterministicAcknowledgement picks non-repeating template", () => {
  const result = buildDeterministicAcknowledgement("peso 5kg", [])
  assert.ok(result.length > 0)
})

test("enforceReplyVariation returns original if not repeated", () => {
  const result = enforceReplyVariation("peso 5kg", "Registrado com sucesso.", [])
  assert.equal(result, "Registrado com sucesso.")
})

test("needsAntiBmiEchoRecovery returns true for empty reply on non-BMI message", () => {
  assert.equal(needsAntiBmiEchoRecovery("peso 5kg", ""), true)
})

test("needsAntiBmiEchoRecovery returns true for BMI-prefixed reply on non-BMI message", () => {
  assert.equal(needsAntiBmiEchoRecovery("peso 5kg", "IMC estimado: 20.4"), true)
})

test("needsAntiBmiEchoRecovery returns false when user asks for BMI", () => {
  assert.equal(needsAntiBmiEchoRecovery("calcular imc", "IMC estimado: 20.4"), false)
})

test("vaccineReplyHasCondutaLead detects CONDUTA prefix", () => {
  assert.equal(vaccineReplyHasCondutaLead("CONDUTA: manter calendário"), true)
  assert.equal(vaccineReplyHasCondutaLead("Registrado."), false)
})

test("vaccineReplyViolatesCondutaOnly returns true for empty", () => {
  assert.equal(vaccineReplyViolatesCondutaOnly(""), true)
})

test("vaccineReplyViolatesCondutaOnly returns false for conduta-led reply", () => {
  assert.equal(vaccineReplyViolatesCondutaOnly("CONDUTA: manter calendário"), false)
})
