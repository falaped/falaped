import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { EXAM_REQUESTS_BUCKET } from "@/lib/constants"

const SIGNED_URL_EXPIRY_SECONDS = 60

/**
 * GET /api/exam-requests/[id]/download
 * Redirects to a signed URL for the exam request PDF if the user owns it.
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

  const { data: examRequest, error: fetchError } = await supabase
    .from("exam_requests")
    .select("id, profile_id, pdf_storage_path")
    .eq("id", id)
    .eq("profile_id", profile.id)
    .single()

  if (fetchError || !examRequest) {
    return Response.json(
      { error: "Pedido de exames não encontrado" },
      { status: 404 },
    )
  }

  if (!examRequest.pdf_storage_path) {
    return Response.json(
      { error: "PDF não disponível para este pedido de exames" },
      { status: 404 },
    )
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(EXAM_REQUESTS_BUCKET)
    .createSignedUrl(examRequest.pdf_storage_path, SIGNED_URL_EXPIRY_SECONDS)

  if (signError || !signed?.signedUrl) {
    console.error("[EXAM_REQUESTS] Signed URL failed", signError)
    return Response.json(
      { error: "Erro ao gerar link de download" },
      { status: 500 },
    )
  }

  return Response.redirect(signed.signedUrl, 302)
}
