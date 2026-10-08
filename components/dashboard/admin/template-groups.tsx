"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { MESSAGE_MOMENTS, MOMENT_LABEL, type MessageMoment } from "@/lib/message-template"
import type { MessageTemplate } from "@/modules/admin/list-message-templates"
import { PanelCard, Pill } from "@/components/dashboard/admin/admin-ui"
import { TemplateEditor, type TemplateDraft } from "@/components/dashboard/admin/template-editor"
import { Button } from "@/components/ui/button"

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

const MOMENT_HINT: Record<MessageMoment, string> = {
  convite: "Para quem ainda não conhece o Falaped",
  indicacao: "Toda mensagem diz quem indicou",
  "follow-up": "Quem abriu e não respondeu",
  "boas-vindas": "Lead da landing ou conta nova",
  ajuda: "Conta que ainda não engrenou",
  "teste-acabando": "Faltam poucos dias de teste",
  pagamento: "Assinatura vencendo ou vencida",
  reativacao: "Conta que parou de usar",
}

/** "12 enviados · 41% abriram · 6% clicaram" (e-mail) ou "8 envios · 3 responderam" (WhatsApp). */
function statsText(t: MessageTemplate): string {
  const s = t.stats
  if (t.channel === "email") {
    const sent = `${s.sent} ${s.sent === 1 ? "enviado" : "enviados"}`
    return s.sent ? `${sent} · ${pct(s.opened, s.sent)}% abriram · ${pct(s.clicked, s.sent)}% clicaram` : sent
  }
  return `${s.sent} ${s.sent === 1 ? "envio" : "envios"} · ${s.replied} responderam`
}

/** Modelos agrupados por momento (protótipo h7), cada um com canal, taxa e o editor. */
export function TemplateGroups({ templates, bestId }: { templates: MessageTemplate[]; bestId: string | null }) {
  const [editing, setEditing] = React.useState<TemplateDraft | null>(null)
  const open = (t: MessageTemplate, copy = false) =>
    setEditing({
      id: copy ? null : t.id,
      moment: t.moment,
      channel: t.channel,
      name: copy ? `${t.name} (cópia)` : t.name,
      subject: t.subject,
      body: t.body,
      sent: t.stats.sent,
    })

  return (
    <>
      {MESSAGE_MOMENTS.map((moment) => {
        const rows = templates.filter((t) => t.moment === moment).sort((a, b) => a.channel.localeCompare(b.channel))
        return (
          <PanelCard
            key={moment}
            title={MOMENT_LABEL[moment]}
            description={MOMENT_HINT[moment]}
            bodyClassName="p-0"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing({ id: null, moment, channel: "whatsapp", name: "", subject: null, body: "" })}
              >
                <PlusIcon data-icon="inline-start" />
                Novo modelo
              </Button>
            }
          >
            {rows.length === 0 ? (
              <p className="px-5 py-5 text-muted-foreground">Nenhum modelo neste momento.</p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((t) => (
                  <li key={t.id} className="grid min-h-14 grid-cols-[minmax(0,1fr)_110px_260px_auto] items-center gap-4 px-5 py-3 hover:bg-accent/40">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-semibold">
                        {t.name}
                        {t.id === bestId ? <Pill tone="green">Melhor abertura</Pill> : null}
                      </div>
                      <p className="truncate text-caption text-muted-foreground">{t.subject ? `Assunto: ${t.subject}` : t.body}</p>
                    </div>
                    <span>
                      <Pill tone={t.channel === "email" ? "blue" : "gray"}>{t.channel === "email" ? "E-mail" : "WhatsApp"}</Pill>
                    </span>
                    <span className="num text-caption text-muted-foreground">{statsText(t)}</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="xs" onClick={() => open(t)}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => open(t, true)}>
                        Duplicar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>
        )
      })}
      <TemplateEditor draft={editing} onClose={() => setEditing(null)} />
    </>
  )
}
