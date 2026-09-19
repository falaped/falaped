"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Mail, Send } from "lucide-react"

import { markBookDeliveredAction, notifyBookProductionAction } from "@/actions/books"
import { BkButton, bkButton } from "@/components/books/books-ui"

/**
 * Abre o WhatsApp do comprador com a mensagem e o link do PDF prontos (o envio
 * é manual, na conversa) e já registra a entrega no pedido.
 */
export function DeliverPdfButton({ bookId, href, delivered }: { bookId: string; href: string; delivered: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        void markBookDeliveredAction(bookId).then((result) => {
          if (!result.ok) toast.error(result.error)
        })
      }}
      className={bkButton(delivered ? "secondary" : "primary", "h-11 text-[13px]")}
    >
      <Send className="size-4" strokeWidth={2.6} aria-hidden />
      {delivered ? "Enviar PDF de novo" : "Enviar PDF no WhatsApp"}
    </a>
  )
}

/** Reenvia o aviso de produção quando o e-mail automático não saiu. */
export function ResendEmailButton({ bookId, recipient }: { bookId: string; recipient: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <BkButton
      variant="warning"
      busy={pending}
      busyLabel="Enviando…"
      className="h-11 text-[13px]"
      onClick={() =>
        startTransition(async () => {
          const result = await notifyBookProductionAction(bookId)
          if (result.ok) toast.success(`E-mail enviado para ${recipient}`, { description: "Aviso de que o livro entrou em produção." })
          else toast.error(result.error)
        })
      }
    >
      <Mail className="size-4" strokeWidth={2.6} aria-hidden />
      Reenviar e-mail
    </BkButton>
  )
}
