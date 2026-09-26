import { createHmac, timingSafeEqual } from "node:crypto"

import { env } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { recordEmailEvent } from "@/modules/admin/record-email-event"

/** Janela que a Svix (assinatura da Resend) tolera entre o envio e a chegada do webhook. */
const TOLERANCE_SECONDS = 5 * 60

/**
 * Assinatura Svix sem a dependência: HMAC-SHA256 de "id.timestamp.corpo" com o segredo
 * (base64 depois de "whsec_"), comparada com cada "v1,<assinatura>" do header.
 */
function isSignatureValid(headers: Headers, rawBody: string, secret: string): boolean {
  const id = headers.get("svix-id")
  const timestamp = headers.get("svix-timestamp")
  const signatures = headers.get("svix-signature")
  if (!id || !timestamp || !signatures) return false
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest()
  return signatures.split(" ").some((part) => {
    const [version, sig] = part.split(",")
    if (version !== "v1" || !sig) return false
    const given = Buffer.from(sig, "base64")
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}

/**
 * POST /api/resend/webhook — a Resend avisa que um e-mail foi entregue, deu bounce ou
 * recebeu reclamação de spam. Só o convite da prospecção interessa: o prospect é achado
 * pelo `resend_email_id` gravado no envio. Responde 2xx no que ignora, para a Resend
 * não pausar a fila.
 */
export async function POST(request: Request) {
  if (!env.RESEND_WEBHOOK_SECRET) return Response.json({ ok: false }, { status: 503 })

  const rawBody = await request.text()
  if (!isSignatureValid(request.headers, rawBody, env.RESEND_WEBHOOK_SECRET))
    return Response.json({ ok: false }, { status: 401 })

  let body: { type?: string; data?: { email_id?: string } } | null = null
  try {
    body = JSON.parse(rawBody)
  } catch {
    return Response.json({ ok: false, error: "corpo inválido" }, { status: 400 })
  }
  const type = body?.type
  const emailId = body?.data?.email_id
  if (!type || !emailId) return Response.json({ ok: true, ignored: "sem evento" })

  try {
    const status = await recordEmailEvent(createAdminClient(), { type, emailId })
    return Response.json({ ok: true, status })
  } catch (error: unknown) {
    console.error("[RESEND_WEBHOOK]", error instanceof Error ? error.message : error)
    return Response.json({ ok: false }, { status: 500 })
  }
}
