import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { REFERRALS_BUCKET } from "@/lib/constants"

const SIGNED_URL_EXPIRY_SECONDS = 60

/**
 * GET /api/referrals/[id]/download
 * Redirects to a signed URL for the referral PDF if the user owns it.
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

  const { data: referral, error: fetchError } = await supabase
    .from("referrals")
    .select("id, profile_id, pdf_storage_path")
    .eq("id", id)
    .eq("profile_id", profile.id)
    .single()

  if (fetchError || !referral) {
    return Response.json(
      { error: "Encaminhamento não encontrado" },
      { status: 404 },
    )
  }

  if (!referral.pdf_storage_path) {
    return Response.json(
      { error: "PDF não disponível para este encaminhamento" },
      { status: 404 },
    )
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(REFERRALS_BUCKET)
    .createSignedUrl(referral.pdf_storage_path, SIGNED_URL_EXPIRY_SECONDS)

  if (signError || !signed?.signedUrl) {
    console.error("[REFERRALS] Signed URL failed", signError)
    return Response.json(
      { error: "Erro ao gerar link de download" },
      { status: 500 },
    )
  }

  return Response.redirect(signed.signedUrl, 302)
}
