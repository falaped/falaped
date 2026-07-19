import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { GUIDANCE_BUCKET } from "@/lib/constants"

const SIGNED_URL_EXPIRY_SECONDS = 60

/**
 * GET /api/guidance/[id]/download
 * Redirects to a signed URL for the guidance document PDF if the user owns it.
 * Uses Response (Web API) instead of NextResponse to avoid ReadableStream
 * instance mismatch in Node/Turbopack.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }
  if (profile.status !== "paid") {
    return Response.json({ error: "Perfil não ativo." }, { status: 403 })
  }

  const { data: guidanceDocument, error: fetchError } = await supabase
    .from("guidance_documents")
    .select("id, profile_id, pdf_storage_path")
    .eq("id", id)
    .eq("profile_id", profile.id)
    .single()

  if (fetchError || !guidanceDocument) {
    return Response.json(
      { error: "Orientação não encontrada" },
      { status: 404 },
    )
  }

  if (!guidanceDocument.pdf_storage_path) {
    return Response.json(
      { error: "PDF não disponível para esta orientação" },
      { status: 404 },
    )
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(GUIDANCE_BUCKET)
    .createSignedUrl(guidanceDocument.pdf_storage_path, SIGNED_URL_EXPIRY_SECONDS)

  if (signError || !signed?.signedUrl) {
    console.error("[GUIDANCE] Signed URL failed", signError)
    return Response.json(
      { error: "Erro ao gerar link de download" },
      { status: 500 },
    )
  }

  return Response.redirect(signed.signedUrl, 302)
}
