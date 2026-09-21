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
/**
 * Chave da Asaas normalizada. Ela começa com "$", que o dotenv do Next trata
 * como variável e expande para vazio — em .env.local precisa ser escrita
 * `\$aact_...`, e aí o `--env-file` do Node, que não expande, entrega a barra
 * junto. Tirar a barra aqui faz as duas grafias funcionarem.
 */
export function asaasApiKey(): string {
  const key = env.ASAAS_API_KEY?.replace(/^\\/, "")
  if (!key)
    throw new Error(
      "[PAYMENTS] ASAAS_API_KEY ausente ou vazia. Em .env.local escreva com barra: ASAAS_API_KEY=\\$aact_...",
    )
  return key
}

export async function asaasRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = asaasApiKey()

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
