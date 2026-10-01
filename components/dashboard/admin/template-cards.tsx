"use client"

import * as React from "react"
import { CopyIcon, PencilIcon, PlusIcon } from "lucide-react"

import type { MessageMoment } from "@/lib/message-template"
import { cn } from "@/lib/utils"
import type { MessageTemplate } from "@/modules/admin/list-message-templates"
import { Pill } from "@/components/dashboard/admin/admin-ui"
import { TemplateEditor, type TemplateDraft } from "@/components/dashboard/admin/template-editor"
import { Button } from "@/components/ui/button"

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

function Stat({ value, label, bar }: { value: string; label: string; bar?: number }) {
  return (
    <div>
      <p className="text-[17px] font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {bar !== undefined ? (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${bar}%` }} />
        </div>
      ) : null}
    </div>
  )
}

/** Cartões dos modelos de um momento, com a taxa de cada um, e o editor. */
export function TemplateCards({ templates, moment, bestId }: { templates: MessageTemplate[]; moment: MessageMoment; bestId: string | null }) {
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
      <div className="grid gap-4 xl:grid-cols-2">
        {templates.map((t) => {
          const best = t.id === bestId
          const s = t.stats
          return (
            <article
              key={t.id}
              className={cn(
                "flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10",
                best && "ring-2 ring-emerald-500/50",
              )}
            >
              <div className="flex gap-1.5">
                <Pill tone={t.channel === "email" ? "blue" : "green"}>{t.channel === "email" ? "E-mail" : "WhatsApp"}</Pill>
                {best ? <Pill tone="green">Melhor abertura</Pill> : null}
              </div>
              <h3 className="text-[15px] font-semibold">{t.name}</h3>
              {t.subject ? <p className="-mt-2 text-[13px] text-muted-foreground">Assunto: {t.subject}</p> : null}
              <p className="line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">{t.body}</p>
              <div className="grid grid-cols-3 gap-3 border-t pt-3">
                {t.channel === "email" ? (
                  <>
                    <Stat value={String(s.sent)} label={s.sent === 1 ? "enviado" : "enviados"} />
                    <Stat value={s.sent ? `${pct(s.opened, s.sent)}%` : "—"} label="abriram" bar={pct(s.opened, s.sent)} />
                    <Stat value={s.sent ? `${pct(s.clicked, s.sent)}%` : "—"} label="clicaram" bar={pct(s.clicked, s.sent)} />
                  </>
                ) : (
                  <>
                    <Stat value={String(s.sent)} label={s.sent === 1 ? "aberto no WhatsApp" : "abertos no WhatsApp"} />
                    <Stat value={String(s.replied)} label="responderam" />
                  </>
                )}
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => open(t)}>
                  <PencilIcon aria-hidden />
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => open(t, true)}>
                  <CopyIcon aria-hidden />
                  Duplicar
                </Button>
              </div>
            </article>
          )
        })}
        <button
          type="button"
          onClick={() => setEditing({ id: null, moment, channel: "whatsapp", name: "", subject: null, body: "" })}
          className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          <PlusIcon className="size-5" aria-hidden />
          Novo modelo neste momento
        </button>
      </div>
      <TemplateEditor draft={editing} onClose={() => setEditing(null)} />
    </>
  )
}
