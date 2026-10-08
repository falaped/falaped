import type { SupabaseClient } from "@supabase/supabase-js"

import type { FeedbackKind, FeedbackStatus } from "@/lib/feedback"

export type FeedbackRow = {
  id: string
  profile_id: string
  kind: FeedbackKind
  message: string
  page: string | null
  status: FeedbackStatus
  created_at: string
  profile: { first_name: string | null; surname: string | null; email: string | null } | null
}

/** Todos os feedbacks, do mais novo para o mais antigo, com quem enviou. Exige service role. */
export async function listFeedback(supabase: SupabaseClient): Promise<FeedbackRow[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select("id, profile_id, kind, message, page, status, created_at, profile:profiles(first_name, surname, email)")
    .order("created_at", { ascending: false })
  if (error) throw new Error(`[ADMIN] Falha ao listar feedback: ${error.message}`)
  return (data ?? []) as unknown as FeedbackRow[]
}
