import { asaasRequest } from "@/modules/payments/asaas-request"

export type AsaasPayment = {
  id: string
  status: string
  value: number
  billingType: string
  externalReference: string | null
  /** QR estático que originou a cobrança. É por aqui que achamos o livro. */
  pixQrCodeId: string | null
}

/**
 * Cobrança na Asaas. Fonte da verdade do pagamento: o corpo do webhook pode
 * chegar duplicado ou fora de ordem, então quem decide se está pago é sempre
 * esta consulta.
 */
export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasRequest<AsaasPayment>(`/payments/${encodeURIComponent(paymentId)}`)
}
