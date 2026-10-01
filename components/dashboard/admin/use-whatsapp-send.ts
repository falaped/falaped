"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { recordProfileWhatsappAction, recordProspectTouchAction, undoProspectTouchAction } from "@/actions"
import { whatsappHref } from "@/lib/admin-tasks"
import type { MessageMoment } from "@/lib/message-template"

export type Recipient = { prospectId: string } | { profileId: string }

/**
 * Abre o WhatsApp com o texto pronto e registra o toque no mesmo clique (sem API da Meta:
 * não dá para saber se a mensagem saiu). No prospect o toast traz "Desfazer".
 */
export function useWhatsappSend(recipient: Recipient, phone: string | null) {
  const router = useRouter()
  const canSend = !!whatsappHref(phone, "")

  const send = React.useCallback(
    async (input: { templateId: string | null; moment: MessageMoment; body: string; label: string }) => {
      const href = whatsappHref(phone, input.body)
      if (!href) {
        toast.error("Sem celular válido: preencha o contato.")
        return
      }
      window.open(href, "_blank", "noopener")

      if ("profileId" in recipient) {
        const r = await recordProfileWhatsappAction({ profileId: recipient.profileId, templateId: input.templateId, moment: input.moment, body: input.body })
        if (!r.ok) toast.error(r.error)
        return
      }
      const r = await recordProspectTouchAction(recipient.prospectId, {
        channel: "whatsapp",
        detail: input.label,
        send: { templateId: input.templateId, moment: input.moment, body: input.body },
      })
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      router.refresh()
      toast.success("WhatsApp registrado na linha do tempo.", {
        action: {
          label: "Desfazer",
          onClick: async () => {
            const u = await undoProspectTouchAction(r.undo)
            if (!u.ok) toast.error(u.error)
            router.refresh()
          },
        },
      })
    },
    [recipient, phone, router],
  )
  return { send, canSend }
}
