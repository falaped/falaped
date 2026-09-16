import type { SupabaseClient } from "@supabase/supabase-js"

import { BOOK_SELECT, type Book } from "@/modules/books/types"

/** Livros do usuário, mais recentes primeiro. */
export async function listBooks(supabase: SupabaseClient, profileId: string): Promise<Book[]> {
  const { data, error } = await supabase
    .from("books")
    .select(BOOK_SELECT)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(`[BOOKS] Falha ao listar livros: ${error.message}`)
  return (data ?? []) as Book[]
}
