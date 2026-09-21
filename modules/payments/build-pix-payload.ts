/**
 * "Copia e cola" do Pix (BR Code, padrão EMV MPM do Banco Central). Gerado
 * aqui em vez de pedir a um intermediário: o dinheiro cai direto na conta do
 * recebedor e não há taxa nem cadastro no meio. Em troca, ninguém avisa que o
 * Pix caiu — a confirmação é do lojista, pelo comprovante.
 */
export type PixPayloadInput = {
  /** Chave Pix do recebedor (CPF, e-mail, telefone ou aleatória). */
  key: string
  /** Valor em reais. Travado no código: o pagador não consegue alterar. */
  amount: number
  /** Nome do recebedor como aparece no app do pagador (até 25 caracteres). */
  merchantName: string
  /** Cidade do recebedor (até 15 caracteres). */
  merchantCity: string
  /** Identificador do pedido, aparece no comprovante e no extrato (até 25). */
  txid: string
}

/** Campo EMV: id + tamanho em 2 dígitos + valor. */
function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`
}

/** Só o que o BR Code aceita em nome, cidade e txid: ASCII sem acento nem símbolo. */
function sanitize(value: string, max: number): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, max)
    .toUpperCase()
}

/** CRC16-CCITT (polinômio 0x1021, inicial 0xFFFF), exigido no campo 63. */
export function crc16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

export function buildPixPayload({ key, amount, merchantName, merchantCity, txid }: PixPayloadInput): string {
  if (!key.trim()) throw new Error("[PAYMENTS] Chave Pix vazia: QR não gerado.")
  if (!(amount > 0)) throw new Error("[PAYMENTS] Valor do Pix precisa ser maior que zero.")

  const reference = sanitize(txid, 25) || "FALAPED"
  const body = [
    field("00", "01"),
    // 12 = uso único. O QR vale para um pedido só, o que evita pagar duas vezes
    // o mesmo código por engano.
    field("01", "12"),
    field("26", field("00", "br.gov.bcb.pix") + field("01", key.trim())),
    field("52", "0000"),
    field("53", "986"),
    field("54", amount.toFixed(2)),
    field("58", "BR"),
    field("59", sanitize(merchantName, 25) || "FALAPED"),
    field("60", sanitize(merchantCity, 15) || "BELO HORIZONTE"),
    field("62", field("05", reference)),
  ].join("")

  const withCrcMarker = `${body}6304`
  return `${withCrcMarker}${crc16(withCrcMarker)}`
}
