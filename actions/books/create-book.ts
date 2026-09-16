"use server"

import { createBookSchema } from "@/lib/schemas/book"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { createBook } from "@/modules/books/create-book"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

/** Campos JSON opcionais do wizard; string vazia ou inválida vira null e o Zod decide. */
function parseJsonField(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || !value.trim()) return null
  try {
    return JSON.parse(value)
  } catch {
    return "inválido"
  }
}

export type CreateBookResult = { ok: true; bookId: string } | { ok: false; error: string }

/** Cria o livro em draft com fotos e logo. A capa é gerada em seguida, na página do livro. */
export async function createBookAction(formData: FormData): Promise<CreateBookResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") return { ok: false, error: "Perfil não ativo." }

  const parsed = createBookSchema.safeParse({
    childName: formData.get("childName"),
    childGender: formData.get("childGender"),
    theme: formData.get("theme"),
    quality: formData.get("quality"),
    dedication: formData.get("dedication") ?? undefined,
    pediatricianName: formData.get("pediatricianName") ?? undefined,
    details: parseJsonField(formData.get("details")),
    story: parseJsonField(formData.get("story")),
  })
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }

  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0)
  const logo = formData.get("pediatricianLogo")
  const pediatricianLogo = logo instanceof File && logo.size > 0 ? logo : null

  try {
    const book = await createBook(createAdminClient(), profile.id, { ...parsed.data, photos, pediatricianLogo })
    return { ok: true, bookId: book.id }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao criar livro." }
  }
}
