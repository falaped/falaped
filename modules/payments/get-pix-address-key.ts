import { asaasRequest } from "@/modules/payments/asaas-request"

type AddressKey = { key: string; status: string }

/**
 * Primeira chave Pix ativa da conta Asaas, usada como destino do QR estático.
 * Vem da API em vez de env var: sandbox e produção têm chaves diferentes e
 * uma var a menos é uma var a menos para apontar para a conta errada.
 */
export async function getPixAddressKey(): Promise<string> {
  const { data } = await asaasRequest<{ data: AddressKey[] }>("/pix/addressKeys")
  const active = (data ?? []).find((k) => k.status === "ACTIVE")
  if (!active) throw new Error("[PAYMENTS] Nenhuma chave Pix ativa na conta Asaas.")
  return active.key
}
