import type { SupabaseClient } from "@supabase/supabase-js"

import { BOOK_ASSETS_BUCKET } from "@/lib/constants"
import { bookPhotoPath, MAX_BOOK_PHOTOS, type BookQuality } from "@/modules/books/constants"
import type { BookGender } from "@/modules/books/render-book-text"
import { getBookTheme } from "@/modules/books/themes"
import { BOOK_SELECT, type Book } from "@/modules/books/types"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_PHOTO_BYTES = 8 * 1024 * 1024

export type CreateBookPayload = {
  childName: string
  childGender: BookGender
  theme: string
  quality: BookQuality
  dedication?: string | null
  pediatricianName?: string | null
  /** 1 a 2 fotos da criança. */
  photos: File[]
  pediatricianLogo?: File | null
}

/**
 * Cria o livro em `draft` para o usuário e sobe as fotos de referência (e o
 * logo do pediatra, se houver) em book-assets/{bookId}/. A geração da capa é
 * um passo separado (generateCover). Caller valida os campos de texto.
 */
export async function createBook(
  supabase: SupabaseClient,
  profileId: string,
  payload: CreateBookPayload,
): Promise<Book> {
  getBookTheme(payload.theme)
  if (payload.photos.length < 1 || payload.photos.length > MAX_BOOK_PHOTOS)
    throw new Error(`[BOOKS] Envie de 1 a ${MAX_BOOK_PHOTOS} fotos da criança.`)
  for (const f of [...payload.photos, ...(payload.pediatricianLogo ? [payload.pediatricianLogo] : [])]) {
    if (!ALLOWED_TYPES.includes(f.type))
      throw new Error("[BOOKS] Tipo de imagem não permitido. Use PNG, JPEG ou WebP.")
    if (f.size > MAX_PHOTO_BYTES) throw new Error("[BOOKS] Imagem muito grande. Envie até 8 MB.")
  }

  const { data: inserted, error: insertError } = await supabase
    .from("books")
    .insert({
      profile_id: profileId,
      child_name: payload.childName.trim(),
      child_gender: payload.childGender,
      theme: payload.theme,
      quality: payload.quality,
      dedication: payload.dedication?.trim() || null,
      pediatrician_name: payload.pediatricianName?.trim() || null,
    })
    .select("id")
    .single()
  if (insertError || !inserted) throw new Error(`[BOOKS] Falha ao criar livro: ${insertError?.message}`)
  const bookId = inserted.id as string

  const storage = supabase.storage.from(BOOK_ASSETS_BUCKET)
  const ext = (f: File) => (f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg")
  const photoPaths: string[] = []
  for (const [i, photo] of payload.photos.entries()) {
    const path = bookPhotoPath(bookId, i + 1, ext(photo))
    const { error } = await storage.upload(path, photo, { contentType: photo.type, upsert: true })
    if (error) throw new Error(`[BOOKS] Falha no upload da foto: ${error.message}`)
    photoPaths.push(path)
  }
  let logoPath: string | null = null
  if (payload.pediatricianLogo) {
    logoPath = `${bookId}/pediatrician-logo.${ext(payload.pediatricianLogo)}`
    const { error } = await storage.upload(logoPath, payload.pediatricianLogo, {
      contentType: payload.pediatricianLogo.type,
      upsert: true,
    })
    if (error) throw new Error(`[BOOKS] Falha no upload do logo: ${error.message}`)
  }

  const { data, error } = await supabase
    .from("books")
    .update({ photo_paths: photoPaths, pediatrician_logo_path: logoPath })
    .eq("id", bookId)
    .select(BOOK_SELECT)
    .single()
  if (error || !data) throw new Error(`[BOOKS] Falha ao salvar fotos do livro: ${error?.message}`)
  return data as Book
}
