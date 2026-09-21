import assert from "node:assert/strict"
import { test } from "node:test"

import { buildPixPayload, crc16 } from "@/modules/payments/build-pix-payload"

const base = {
  key: "f6e76f2b-57bc-4303-bd28-2c40c46116a2",
  amount: 29.99,
  merchantName: "Falaped",
  merchantCity: "Belo Horizonte",
  txid: "FALAPEDABC123",
}

/** Lê um campo EMV de primeiro nível pelo id. */
function readField(payload: string, id: string): string | null {
  let i = 0
  while (i < payload.length - 4) {
    const current = payload.slice(i, i + 2)
    const len = Number(payload.slice(i + 2, i + 4))
    const value = payload.slice(i + 4, i + 4 + len)
    if (current === id) return value
    i += 4 + len
  }
  return null
}

test("CRC16-CCITT bate com o valor conhecido do padrão", () => {
  // Exemplo do manual do BR Code: "123456789" => CRC 29B1.
  assert.equal(crc16("123456789"), "29B1")
})

test("BR Code traz chave, valor, moeda, país e txid, e fecha com CRC válido", () => {
  const payload = buildPixPayload(base)

  assert.equal(readField(payload, "00"), "01")
  assert.equal(readField(payload, "01"), "12", "uso único")
  assert.equal(readField(payload, "53"), "986", "BRL")
  assert.equal(readField(payload, "54"), "29.99")
  assert.equal(readField(payload, "58"), "BR")
  assert.equal(readField(payload, "59"), "FALAPED")
  assert.equal(readField(payload, "60"), "BELO HORIZONTE")
  assert.match(readField(payload, "26") ?? "", /br\.gov\.bcb\.pix/)
  assert.match(readField(payload, "26") ?? "", new RegExp(base.key))
  assert.match(readField(payload, "62") ?? "", /FALAPEDABC123/)

  // O CRC cobre tudo, inclusive o "6304" que o antecede.
  const body = payload.slice(0, -4)
  assert.equal(payload.slice(-4), crc16(body))
  assert.ok(body.endsWith("6304"))
})

test("valor com desconto e nome acentuado saem no formato aceito", () => {
  const payload = buildPixPayload({ ...base, amount: 26.99, merchantName: "Falapéd Livros", merchantCity: "São Paulo" })
  assert.equal(readField(payload, "54"), "26.99")
  assert.equal(readField(payload, "59"), "FALAPED LIVROS", "sem acento")
  assert.equal(readField(payload, "60"), "SAO PAULO")
})

test("recusa chave vazia e valor zerado em vez de gerar um QR impagável", () => {
  assert.throws(() => buildPixPayload({ ...base, key: "  " }), /Chave Pix vazia/)
  assert.throws(() => buildPixPayload({ ...base, amount: 0 }), /maior que zero/)
})

test("nome e cidade longos são cortados nos limites do padrão", () => {
  const payload = buildPixPayload({ ...base, merchantName: "A".repeat(40), merchantCity: "B".repeat(30) })
  assert.equal((readField(payload, "59") ?? "").length, 25)
  assert.equal((readField(payload, "60") ?? "").length, 15)
})
