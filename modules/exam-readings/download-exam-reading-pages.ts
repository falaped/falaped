import type { SupabaseClient } from "@supabase/supabase-js"

import { PATIENT_ATTACHMENTS_BUCKET } from "@/lib/constants"

/** Baixa as páginas da leitura, na ordem, como Buffers. */
export async function downloadExamReadingPages(
  supabase: SupabaseClient,
  pagePaths: string[],
): Promise<Buffer[]> {
  return Promise.all(
    pagePaths.map(async (path) => {
      const { data, error } = await supabase.storage
        .from(PATIENT_ATTACHMENTS_BUCKET)
        .download(path)
      if (error || !data)
        throw new Error(`[EXAM_READINGS] download page failed: ${error?.message ?? path}`)
      return Buffer.from(await data.arrayBuffer())
    }),
  )
}
