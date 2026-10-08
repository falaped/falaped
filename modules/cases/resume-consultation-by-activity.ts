import type { SupabaseClient } from "@supabase/supabase-js"

import { resumeByActivity } from "@/lib/consult-idle"

/**
 * Pausa manual seguida de algo salvo na consulta: grava a retomada, para o cronômetro e o
 * botão de pausar refletirem que a médica voltou (ver `resumeByActivity`). Devolve o
 * estado novo do cronômetro, ou null quando nada muda. Dono já conferido por quem chama.
 * @throws Error("[CASES] ...") se o update falhar
 */
export async function resumeConsultationByActivity(
  supabase: SupabaseClient,
  profileId: string,
  timer: { caseId: string; startedAt: string; pausedMs: number; pausedAt: string | null },
  activityAts: string[],
): Promise<{ pausedMs: number; pausedAt: null } | null> {
  const resumed = resumeByActivity(timer, activityAts)
  if (!resumed) return null
  const { error } = await supabase
    .from("cases")
    .update({ consultation_paused_ms: resumed.pausedMs, consultation_paused_at: null })
    .eq("id", timer.caseId)
    .eq("profile_id", profileId)
  if (error) throw new Error(`[CASES] Failed to resume consultation: ${error.message}`)
  return resumed
}
