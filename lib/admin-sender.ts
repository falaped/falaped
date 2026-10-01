import { env } from "@/lib/env"

/** Quem assina as mensagens do admin: o primeiro nome do remetente do convite ("Filipe"). */
export const ADMIN_SENDER = env.INVITE_EMAIL_FROM.split("<")[0].trim().split(/[\s,]+/)[0] || "Falaped"
