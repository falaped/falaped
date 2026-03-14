import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

const SIGNED_URL_EXPIRY_SECONDS = 60

/**
 * GET /dashboard/medical-certificates/[id]/download
 * Redirects to a signed URL for the certificate PDF if the user owns it.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { data: cert, error: fetchError } = await supabase
    .from("medical_certificates")
    .select("id, profile_id, pdf_storage_path")
    .eq("id", id)
    .eq("profile_id", profile.id)
    .single()

  if (fetchError || !cert) {
    return NextResponse.json({ error: "Atestado não encontrado" }, { status: 404 })
  }

  if (!cert.pdf_storage_path) {
    return NextResponse.json(
      { error: "PDF não disponível para este atestado" },
      { status: 404 },
    )
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("medical-certificates")
    .createSignedUrl(cert.pdf_storage_path, SIGNED_URL_EXPIRY_SECONDS)

  if (signError || !signed?.signedUrl) {
    console.error("[MEDICAL_CERTIFICATES] Signed URL failed", signError)
    return NextResponse.json(
      { error: "Erro ao gerar link de download" },
      { status: 500 },
    )
  }

  return NextResponse.redirect(signed.signedUrl)
}
