"use client"

import * as React from "react"
import { ChevronDownIcon, MailIcon, MessageCircleIcon, SparklesIcon } from "lucide-react"

import { MESSAGE_MOMENTS, MOMENT_LABEL, momentsFor, renderTemplate, type MessageMoment, type TemplateValues } from "@/lib/message-template"
import { cn } from "@/lib/utils"
import type { MessageTemplate } from "@/modules/admin/list-message-templates"
import { WHATSAPP_BUTTON } from "@/components/dashboard/admin/admin-ui"
import { MessageComposer } from "@/components/dashboard/admin/message-composer"
import { useWhatsappSend, type Recipient } from "@/components/dashboard/admin/use-whatsapp-send"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Props = {
  recipient: Recipient
  name: string
  email: string | null
  phone: string | null
  templates: MessageTemplate[]
  values: TemplateValues
  context: string
  defaultMoment: MessageMoment
}

/** Botão WhatsApp: escolhe o tipo de mensagem, abre o app com o texto pronto e registra o toque. */
export function WhatsappMenu(props: Props) {
  const { send, canSend } = useWhatsappSend(props.recipient, props.phone)
  const [composer, setComposer] = React.useState(false)
  const wa = props.templates.filter((t) => t.channel === "whatsapp")
  // Momento sugerido primeiro, depois a ordem natural.
  const allowed = momentsFor("prospectId" in props.recipient, props.values)
  const moments = [props.defaultMoment, ...MESSAGE_MOMENTS.filter((m) => m !== props.defaultMoment)].filter(
    (m) => allowed.includes(m) && wa.some((t) => t.moment === m),
  )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className={WHATSAPP_BUTTON} disabled={!canSend} title={canSend ? undefined : "Sem celular válido"}>
            <MessageCircleIcon aria-hidden />
            WhatsApp
            <ChevronDownIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[70vh] w-80 overflow-auto">
          {moments.map((m, i) => (
            <React.Fragment key={m}>
              {i > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{MOMENT_LABEL[m]}</DropdownMenuLabel>
              {wa
                .filter((t) => t.moment === m)
                .map((t) => {
                  const body = renderTemplate(t.body, props.values)
                  return (
                    <DropdownMenuItem
                      key={t.id}
                      className="flex-col items-start gap-0.5"
                      onSelect={() => send({ templateId: t.id, moment: t.moment, body, label: t.name })}
                    >
                      <span className="font-medium">{t.name}</span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">{body}</span>
                    </DropdownMenuItem>
                  )
                })}
            </React.Fragment>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setComposer(true)} className="font-medium text-primary-ink">
            <SparklesIcon className="text-primary-ink" aria-hidden />
            Editar ou escrever com IA…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <MessageComposer
        open={composer}
        onOpenChange={setComposer}
        channel="whatsapp"
        recipient={props.recipient}
        name={props.name}
        address={props.email}
        phone={props.phone}
        templates={props.templates}
        values={props.values}
        context={props.context}
        defaultMoment={props.defaultMoment}
      />
    </>
  )
}

/** Botão "E-mail" que abre o composer no momento sugerido. */
export function EmailComposerButton({ className, label = "E-mail", ...props }: Props & { className?: string; label?: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button variant="outline" className={cn(className)} onClick={() => setOpen(true)} disabled={!props.email} title={props.email ? undefined : "Sem e-mail"}>
        <MailIcon aria-hidden />
        {label}
      </Button>
      <MessageComposer
        open={open}
        onOpenChange={setOpen}
        channel="email"
        recipient={props.recipient}
        name={props.name}
        address={props.email}
        phone={props.phone}
        templates={props.templates}
        values={props.values}
        context={props.context}
        defaultMoment={props.defaultMoment}
      />
    </>
  )
}

/** Ação direta do alerta: manda o modelo de WhatsApp com esse nome no momento sugerido, senão o primeiro dele. */
export function WhatsappQuickSend({ label, templateName, ...props }: Props & { label: string; templateName?: string }) {
  const { send, canSend } = useWhatsappSend(props.recipient, props.phone)
  const ofMoment = props.templates.filter((x) => x.channel === "whatsapp" && x.moment === props.defaultMoment)
  const t = ofMoment.find((x) => x.name === templateName) ?? ofMoment[0]
  if (!t || !canSend) return null
  return (
    <Button className={WHATSAPP_BUTTON} onClick={() => send({ templateId: t.id, moment: t.moment, body: renderTemplate(t.body, props.values), label: t.name })}>
      <MessageCircleIcon aria-hidden />
      {label}
    </Button>
  )
}
