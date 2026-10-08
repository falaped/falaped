"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MessageCircleIcon, SendIcon, SparklesIcon, WandSparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { draftMessageWithAiAction, sendMessageEmailAction } from "@/actions"
import {
  MESSAGE_MOMENTS,
  MOMENT_LABEL,
  momentsFor,
  renderTemplate,
  type MessageChannel,
  type MessageMoment,
  type TemplateValues,
} from "@/lib/message-template"
import { cn } from "@/lib/utils"
import type { MessageTemplate } from "@/modules/admin/list-message-templates"
import { useWhatsappSend, type Recipient } from "@/components/dashboard/admin/use-whatsapp-send"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—")

/**
 * Composer de mensagem para uma pessoa: escolhe o momento e o modelo, preenche com os dados
 * dela, deixa editar e reescrever com IA (instrução opcional) e então envia o e-mail pela
 * Resend ou abre o WhatsApp com o texto, registrando o envio.
 */
export function MessageComposer({
  open,
  onOpenChange,
  channel,
  recipient,
  name,
  address,
  phone,
  templates,
  values,
  context,
  defaultMoment,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  channel: MessageChannel
  recipient: Recipient
  name: string
  /** E-mail do destinatário (só para exibir). */
  address: string | null
  phone: string | null
  templates: MessageTemplate[]
  values: TemplateValues
  /** O que a IA sabe da pessoa: etapa, temperatura, notas, últimos toques. */
  context: string
  defaultMoment: MessageMoment
}) {
  const router = useRouter()
  const { send: sendWhatsapp } = useWhatsappSend(recipient, phone)
  const ofChannel = templates.filter((t) => t.channel === channel)
  const allowed = momentsFor("prospectId" in recipient, values)
  const moments = MESSAGE_MOMENTS.filter((m) => allowed.includes(m) && ofChannel.some((t) => t.moment === m))
  const [moment, setMoment] = React.useState<MessageMoment>(moments.includes(defaultMoment) ? defaultMoment : (moments[0] ?? defaultMoment))
  const [templateId, setTemplateId] = React.useState<string | null>(null)
  const [subject, setSubject] = React.useState("")
  const [body, setBody] = React.useState("")
  const [instruction, setInstruction] = React.useState("")
  const [busy, setBusy] = React.useState<"ai" | "send" | null>(null)

  const pick = React.useCallback(
    (t: MessageTemplate | undefined) => {
      setTemplateId(t?.id ?? null)
      setSubject(t?.subject ? renderTemplate(t.subject, values) : "")
      setBody(t ? renderTemplate(t.body, values, channel) : "")
    },
    [values, channel],
  )

  // Ao abrir ou trocar de momento, começa pelo primeiro modelo daquele momento.
  React.useEffect(() => {
    if (open) pick(ofChannel.find((t) => t.moment === moment))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, moment, channel])

  const listed = ofChannel.filter((t) => t.moment === moment)
  const template = templates.find((t) => t.id === templateId) ?? null

  async function generate() {
    setBusy("ai")
    try {
      const r = await draftMessageWithAiAction({
        channel,
        moment,
        instruction: instruction.trim() || null,
        context,
        base: body.trim() ? { subject: subject || null, body } : null,
        keepVariables: false,
      })
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      if (r.draft.subject) setSubject(r.draft.subject)
      setBody(r.draft.body)
    } finally {
      setBusy(null)
    }
  }

  async function send() {
    if (channel === "whatsapp") {
      await sendWhatsapp({ templateId, moment, body, label: template?.name ?? MOMENT_LABEL[moment] })
      onOpenChange(false)
      return
    }
    setBusy("send")
    try {
      const r = await sendMessageEmailAction({ to: recipient, templateId, templateName: template?.name ?? null, moment, subject, body })
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("E-mail enviado.")
      onOpenChange(false)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{channel === "email" ? `Enviar e-mail para ${name}` : `WhatsApp para ${name}`}</DialogTitle>
          <DialogDescription>{channel === "email" ? (address ?? "sem e-mail") : (phone ?? "sem celular")}</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="flex flex-col gap-3 border-b p-5 md:border-r md:border-b-0">
            <p className="text-[13px] font-medium text-muted-foreground">Momento</p>
            <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
              {moments.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMoment(m)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[13px] transition-colors",
                    m === moment ? "bg-card font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {MOMENT_LABEL[m]}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {listed.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pick(t)}
                  className={cn(
                    "rounded-xl border border-border px-3.5 py-2.5 text-left transition-colors hover:bg-accent",
                    t.id === templateId && "border-primary-soft-border bg-primary-soft",
                  )}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-medium">
                    {t.name}
                    <span className="text-xs font-medium text-success-text">
                      {channel === "email"
                        ? t.stats.sent
                          ? `${pct(t.stats.opened, t.stats.sent)} abrem`
                          : "novo"
                        : `${t.stats.sent} ${t.stats.sent === 1 ? "envio" : "envios"}`}
                    </span>
                  </span>
                  <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{renderTemplate(t.body, values, channel)}</span>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-primary-soft-border bg-primary-soft p-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-primary-ink">
                <SparklesIcon className="size-4" aria-hidden />
                Reescrever com IA
              </p>
              <Textarea
                rows={2}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Ex.: ele prefere WhatsApp e atende só à tarde; ofereça uma call de 10 min"
                className="bg-card"
              />
              <div className="mt-2 flex justify-end">
                <Button variant="outline" size="sm" onClick={generate} disabled={busy !== null}>
                  <WandSparklesIcon aria-hidden />
                  {busy === "ai" ? "Escrevendo…" : "Gerar versão"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-muted/30 p-5">
            <p className="text-[13px] font-medium text-muted-foreground">Prévia, editável</p>
            {channel === "email" ? (
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto" aria-label="Assunto" className="bg-card" />
            ) : null}
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={channel === "email" ? 14 : 8}
              aria-label="Texto"
              className="flex-1 bg-card text-sm leading-relaxed"
            />
            {channel === "email" ? (
              <p className="text-xs text-muted-foreground">A assinatura “Um abraço, CEO · Falaped” entra no fim, no layout da marca.</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-6 py-3.5">
          <span className="text-[13px] text-muted-foreground">O envio entra na linha do tempo e na taxa do modelo.</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {channel === "email" ? (
              <Button onClick={send} disabled={busy !== null || !body.trim() || !subject.trim() || !address}>
                <SendIcon aria-hidden />
                {busy === "send" ? "Enviando…" : "Enviar e-mail"}
              </Button>
            ) : (
              <Button onClick={send} disabled={busy !== null || !body.trim() || !phone}>
                <MessageCircleIcon aria-hidden />
                Abrir no WhatsApp
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
