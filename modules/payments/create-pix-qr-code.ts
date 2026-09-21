import { asaasRequest } from "@/modules/payments/asaas-request"
import { getPixAddressKey } from "@/modules/payments/get-pix-address-key"

export type PixQrCode = {
  id: string
  /** Copia e cola do Pix. */
  payload: string
  /** PNG em base64, sem o prefixo data:. */
  encodedImage: string
  expiresAt: string
}

export type CreatePixQrCodeInput = {
  /** Valor em reais (ex.: 29.99). */
  value: number
  /** Aparece no app do banco de quem paga. */
  description: string
  /** Nosso id (o livro), devolvido no pagamento. */
  externalReference: string
  expiresInSeconds: number
}

/**
 * QR Code Pix estático de uso único e valor fixo. Estático porque a cobrança
 * dinâmica exigiria criar um cliente com CPF, e a landing não pede CPF: aqui
 * a Asaas cria a cobrança sozinha quando o Pix cai, e o webhook liga o
 * pagamento ao livro pelo `pixQrCodeId`.
 */
export async function createPixQrCode(input: CreatePixQrCodeInput): Promise<PixQrCode> {
  const addressKey = await getPixAddressKey()
  const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000)
  const created = await asaasRequest<{ id: string; payload: string; encodedImage: string }>("/pix/qrCodes/static", {
    method: "POST",
    body: JSON.stringify({
      addressKey,
      description: input.description,
      value: input.value,
      format: "ALL",
      expirationSeconds: input.expiresInSeconds,
      allowsMultiplePayments: false,
      externalReference: input.externalReference,
    }),
  })
  return { id: created.id, payload: created.payload, encodedImage: created.encodedImage, expiresAt: expiresAt.toISOString() }
}
