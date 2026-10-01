import assert from "node:assert/strict"
import { test } from "node:test"

import { accountTask, leadTask, prospectTask, summarizeTasks, whatsappDigits } from "./admin-tasks"

const now = new Date("2026-10-01T12:00:00Z")
const account = {
  profile_id: "p1",
  first_name: "Camila",
  surname: "Torres",
  email: "c@x.com",
  phone: "553791290679",
  created_at: "2026-09-21T12:00:00Z",
  status: "paid",
  trial_ends_at: null,
  paid_until: null,
  last_activity_at: null,
  last_sign_in_at: "2026-09-21T22:25:00Z",
}

test("pagou e não usou vai para agora, com WhatsApp pronto", () => {
  const t = accountTask(account, "Filipe", now)!
  assert.equal(t.kind, "pagou-sem-uso")
  assert.equal(t.group, "agora")
  assert.equal(t.pill.label, "Pagou, nunca usou")
  assert.match(t.action!.href, /^https:\/\/wa\.me\/553791290679\?text=Oi%2C%20Camila/)
  assert.equal(accountTask({ ...account, last_sign_in_at: null }, "Filipe", now)!.pill.label, "Pagou, nunca entrou")
})

test("teste: acaba em 2 dias é agora, em 5 é semana; conta ativa em dia não gera tarefa", () => {
  const trial = { ...account, status: "unpaid", last_activity_at: "2026-09-30T12:00:00Z" }
  assert.equal(accountTask({ ...trial, trial_ends_at: "2026-10-03T12:00:00Z" }, "F", now)!.group, "agora")
  assert.equal(accountTask({ ...trial, trial_ends_at: "2026-10-06T12:00:00Z" }, "F", now)!.group, "semana")
  assert.equal(accountTask({ ...account, last_activity_at: "2026-09-30T12:00:00Z" }, "F", now), null)
})

test("lead e prospect", () => {
  const lead = { id: "l1", name: "Paula Reis", email: null, phone: "31 99999-8888", detail: null, created_at: "2026-10-01T10:00:00Z" }
  assert.equal(leadTask(lead, "F", now)!.group, "agora")
  assert.equal(leadTask({ ...lead, created_at: "2026-09-01T10:00:00Z" }, "F", now), null)
  const p = { id: "x", title: "Dr.", name: "Marcos", city: "BH", email: null, phone: "(31) 98888-7777", status: "contatado", email_status: "clicou", profile_id: null }
  assert.equal(prospectTask(p, "F")!.pill.label, "Quente")
  assert.equal(prospectTask({ ...p, status: "respondeu" }, "F"), null)
  assert.equal(prospectTask({ ...p, profile_id: "p1" }, "F"), null)
})

test("whatsappDigits normaliza com DDI", () => {
  assert.equal(whatsappDigits("(31) 98888-7777"), "5531988887777")
  assert.equal(whatsappDigits("553791290679"), "553791290679")
  assert.equal(whatsappDigits("123"), null)
})

test("resumo junta os tipos em uma frase", () => {
  const t1 = accountTask(account, "F", now)!
  const t2 = { ...t1, key: "b" }
  const lead = leadTask({ id: "l", name: "P", email: "p@x", phone: null, detail: null, created_at: "2026-10-01T10:00:00Z" }, "F", now)!
  assert.equal(summarizeTasks([t1, t2, lead]), "2 clientes pagaram e ainda não usaram e chegou 1 lead novo.")
  assert.equal(summarizeTasks([]), "Nada pendente hoje. Bom momento para prospectar.")
})
