import { test } from "node:test"
import assert from "node:assert/strict"

import { funnelRank, funnelStage, isClinicEmail, isFollowUpDue, temperature } from "@/lib/funnel"

const now = new Date("2026-10-01T12:00:00Z")
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString()
const base = {
  status: "contatado" as const,
  profile: null,
  clicked_at: null,
  opened_at: null,
  replied_at: null,
  lead_at: null,
  last_channel: null,
  last_contact_at: null,
  next_contact_at: null,
}

test("etapa vem do perfil quando existe conta", () => {
  assert.equal(funnelStage(base), "contatado")
  assert.equal(funnelStage({ ...base, profile: { id: "p", status: "trial", created_at: daysAgo(3), cases: 0 } }), "em-teste")
  assert.equal(funnelStage({ ...base, profile: { id: "p", status: "paid", created_at: daysAgo(40), cases: 9 } }), "cliente")
})

test("quente pelo sinal mais recente em até 14 dias", () => {
  assert.deepEqual(temperature({ ...base, clicked_at: daysAgo(1), lead_at: daysAgo(10) }, now), { temp: "quente", reason: "clicou ontem" })
  assert.deepEqual(temperature({ ...base, lead_at: daysAgo(0) }, now), { temp: "quente", reason: "veio pela landing hoje" })
  assert.equal(temperature({ ...base, clicked_at: daysAgo(15) }, now)?.temp, "frio")
})

test("morna por abertura ou WhatsApp em até 30 dias", () => {
  assert.deepEqual(temperature({ ...base, opened_at: daysAgo(3) }, now), { temp: "morno", reason: "abriu há 3 dias" })
  assert.deepEqual(
    temperature({ ...base, last_channel: "whatsapp", last_contact_at: daysAgo(8) }, now),
    { temp: "morno", reason: "WhatsApp há 8 dias" },
  )
  assert.equal(temperature({ ...base, opened_at: daysAgo(31) }, now)?.temp, "frio")
})

test("cliente e perdido não têm temperatura", () => {
  assert.equal(temperature({ ...base, status: "perdido", clicked_at: daysAgo(1) }, now), null)
  assert.equal(temperature({ ...base, profile: { id: "p", status: "paid", created_at: daysAgo(1), cases: 0 } }, now), null)
})

test("follow-up vencido só nas etapas manuais e ordem da lista", () => {
  const due = { ...base, next_contact_at: daysAgo(2) }
  assert.equal(isFollowUpDue(due, now), true)
  assert.equal(isFollowUpDue({ ...due, status: "perdido" }, now), false)
  assert.equal(funnelRank({ ...base, clicked_at: daysAgo(1) }, now), 0)
  assert.equal(funnelRank(due, now), 1)
  assert.equal(funnelRank({ ...base, opened_at: daysAgo(5) }, now), 2)
  assert.equal(funnelRank(base, now), 3)
})

test("e-mail de clínica: caixa genérica ou compartilhado", () => {
  const shared = new Set(["bambinigestao@gmail.com"])
  assert.equal(isClinicEmail("Contato@clinicadacidade.com.br", shared), true)
  assert.equal(isClinicEmail("sac@servcor.com", shared), true)
  assert.equal(isClinicEmail("bambinigestao@gmail.com", shared), true)
  assert.equal(isClinicEmail("dra.marcelle@gmail.com", shared), false)
  assert.equal(isClinicEmail(null, shared), false)
})
