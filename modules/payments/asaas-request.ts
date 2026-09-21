import { env } from "@/lib/env"

const SANDBOX = "https://api-sandbox.asaas.com/v3"
const PRODUCTION = "https://api.asaas.com/v3"

/**
 * Base da API pelo prefixo da própria chave ($aact_prod_ = produção). Evita uma
 * env var de ambiente que sai de sincronia e aponta a chave de teste para a
 * conta real.
 */
export function asaasBaseUrl(apiKey: string): string {
  return apiKey.startsWith("$aact_prod_") ? PRODUCTION : SANDBOX
}

/**
 * Chamada autenticada na Asaas. Erro vira `[PAYMENTS] ...` com a mensagem que a
 * API devolveu, que é o que aparece no log quando uma cobrança não sai.
 */
export async function asaasRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = env.ASAAS_API_KEY
  if (!apiKey) throw new Error("[PAYMENTS] ASAAS_API_KEY ausente: cobrança não gerada.")

  const response = await fetch(`${asaasBaseUrl(apiKey)}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      // Obrigatório para contas criadas após 06/11/2024.
      "user-agent": "Falaped Books",
      access_token: apiKey,
      ...init?.headers,
    },
    cache: "no-store",
  })

  const body = (await response.json().catch(() => null)) as { errors?: { description?: string }[] } | null
  if (!response.ok) {
    const detail = body?.errors?.map((e) => e.description).filter(Boolean).join("; ")
    throw new Error(`[PAYMENTS] Asaas ${response.status}: ${detail || "falha na chamada."}`)
  }
  return body as T
}
