import type { SupabaseClient } from "@supabase/supabase-js"

import type { FeedbackKind } from "@/lib/feedback"

/** Grava o feedback do médico; o status nasce "novo" (a RLS só aceita assim). */
export async function createFeedback(
  supabase: SupabaseClient,
  input: { profileId: string; kind: FeedbackKind; message: string; page: string | null },
): Promise<void> {
  const { error } = await supabase.from("feedback").insert({
    profile_id: input.profileId,
    kind: input.kind,
    message: input.message,
    page: input.page,
  })
  if (error) throw new Error(`[FEEDBACK] Falha ao enviar: ${error.message}`)
}
