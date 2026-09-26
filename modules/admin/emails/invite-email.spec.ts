import assert from "node:assert/strict"
import { test } from "node:test"

import { buildInviteEmail, INVITE_DISCOUNT_PERCENT } from "./invite-email"

const base = { senderName: "Filipe", replyTo: "contato@falaped.com.br" }

test("desconto: 149,99 → 49,99 é 67%", () => {
  assert.equal(INVITE_DISCOUNT_PERCENT, 67)
})

test("médico: curto, exclusivo, com escassez, preço âncora e desconto, pedindo resposta", () => {
  const m = buildInviteEmail({ ...base, title: "Dra.", name: "Paula Carvalho Ribeiro", city: "Alfenas", kind: "médico" })
  assert.equal(m.subject, "Dra. Paula, um convite para a versão inicial do Falaped")
  assert.match(m.text, /^Olá, Dra\. Paula,/)
  assert.match(m.text, /Sou Filipe, CEO do Falaped\. Seu nome saiu numa seleção que fiz de pediatras de Alfenas e região/)
  assert.match(m.text, /ouvi de muitos pediatras a mesma história/)
  assert.match(m.text, /grupo pequeno de pediatras de Minas para a versão inicial/)
  assert.match(m.text, /15 dias grátis, sem cartão/)
  assert.match(m.text, /Fechando dentro desses 15 dias, o plano sai por R\$ 49,99 por mês em vez de R\$ 149,99: 67% de desconto/)
  assert.match(m.text, /responda este e-mail dizendo que tem interesse/)
  assert.match(m.text, /Eu mesmo faço o seu cadastro/)
  assert.ok(!/!/.test(m.text), "copy sem exclamação")
  assert.ok(!/\?/.test(m.text), "copy sem pergunta retórica")
  assert.ok(m.text.split(/\s+/).length < 230, `curto: ${m.text.split(/\s+/).length} palavras`)
  assert.match(m.text, /responda "não"/)
  assert.ok(m.html.includes("mailto:contato@falaped.com.br"))
  assert.ok(m.html.includes("Responder que tenho interesse"))
  assert.ok(m.html.includes("utm_campaign=prospeccao-mg"))
  assert.ok(m.html.includes("#8ab4eb"))
  assert.ok(m.html.includes(">FALA<") && m.html.includes(">PED<"))
})

test("clínica: usa o nome inteiro, sem título, fala com a equipe, cai em Minas sem cidade e escapa HTML", () => {
  const m = buildInviteEmail({ ...base, title: null, name: "Clínica <Vida>", city: null, kind: "clínica" })
  assert.equal(m.subject, "Convite para a Clínica <Vida>: versão inicial do Falaped")
  assert.match(m.text, /^Olá, equipe da Clínica <Vida>,/)
  assert.match(m.text, /consultórios de pediatria de Minas/)
  assert.match(m.text, /tirar isso das costas da equipe/)
  assert.ok(!m.html.includes("<Vida>"))
  assert.ok(m.html.includes("&lt;Vida&gt;"))
})
