import type { GroqUsage } from "@/modules/groq/lib/parse-groq-usage"
import { createAdminClient } from "@/lib/supabase/server-admin"

/**
 * Grava uma chamada ao Groq em `ai_usage_events` (o Groq não tem API de consumo).
 * Nunca derruba a chamada de IA: sem service role ou com erro no insert, só loga.
 */
export async function recordAiUsage(feature: string, usage: GroqUsage): Promise<void> {
  try {
    const { error } = await createAdminClient().from("ai_usage_events").insert({ feature, ...usage })
    if (error) console.error("[AI_USAGE] insert failed", error.message)
  } catch (error: unknown) {
    console.error("[AI_USAGE] skipped", error instanceof Error ? error.message : error)
  }
}
