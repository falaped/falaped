"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SparklesIcon, WandSparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { draftMessageWithAiAction, saveMessageTemplateAction } from "@/actions"
import {
  MOMENT_LABEL,
  TEMPLATE_VARS,
  renderTemplate,
  type MessageChannel,
  type TemplateVar,
} from "@/lib/message-template"
import { cn } from "@/lib/utils"
import type { MessageTemplate } from "@/modules/admin/list-message-templates"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type TemplateDraft = Pick<MessageTemplate, "moment" | "channel" | "name" | "subject" | "body"> & { id: string | null; sent?: number }

/** Editor de modelo: nome, assunto, texto com variáveis clicáveis, prévia preenchida e "Melhorar com IA". */
export function TemplateEditor({ draft, onClose }: { draft: TemplateDraft | null; onClose: () => void }) {
  const router = useRouter()
  const [t, setT] = React.useState<TemplateDraft | null>(draft)
  const [instruction, setInstruction] = React.useState("")
  const [busy, setBusy] = React.useState<"ai" | "save" | "archive" | null>(null)
  const bodyRef = React.useRef<HTMLTextAreaElement>(null)
  React.useEffect(() => setT(draft), [draft])
  if (!t) return null

  const set = (patch: Partial<TemplateDraft>) => setT({ ...t, ...patch })
  const insertVar = (v: TemplateVar) => {
    const el = bodyRef.current
    const token = `{${v}}`
    if (!el) return set({ body: t.body + token })
    const { selectionStart: a, selectionEnd: b } = el
    set({ body: t.body.slice(0, a) + token + t.body.slice(b) })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(a + token.length, a + token.length)
    })
  }

  async function improve() {
    setBusy("ai")
    try {
      const r = await draftMessageWithAiAction({
        channel: t!.channel,
        moment: t!.moment,
        instruction: instruction.trim() || null,
        context: null,
        base: t!.body.trim() ? { subject: t!.subject, body: t!.body } : null,
        keepVariables: true,
      })
      if (!r.ok) return void toast.error(r.error)
      set({ body: r.draft.body, ...(r.draft.subject && { subject: r.draft.subject }) })
    } finally {
      setBusy(null)
    }
  }

  async function save(archived = false) {
    setBusy(archived ? "archive" : "save")
    try {
      const r = await saveMessageTemplateAction(t!.id, {
        moment: t!.moment,
        channel: t!.channel,
        name: t!.name,
        subject: t!.subject,
        body: t!.body,
        archived,
      })
      if (!r.ok) return void toast.error(r.error)
      toast.success(archived ? "Modelo arquivado." : "Modelo salvo.")
      onClose()
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{t.id ? "Editar modelo" : "Novo modelo"}</DialogTitle>
          <DialogDescription>
            {MOMENT_LABEL[t.moment]} · {t.channel === "email" ? "e-mail" : "WhatsApp"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2">
          <div className="flex flex-col gap-3 border-b p-5 md:border-r md:border-b-0">
            {!t.id ? (
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {(["email", "whatsapp"] as MessageChannel[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set({ channel: c })}
                    className={cn("flex-1 rounded-md py-1 text-[13px]", t.channel === c ? "bg-card font-medium shadow-xs" : "text-muted-foreground")}
                  >
                    {c === "email" ? "E-mail" : "WhatsApp"}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-name">Nome</Label>
              <Input id="tpl-name" value={t.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Convite frio · relato" />
            </div>
            {t.channel === "email" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-subject">Assunto</Label>
                <Input id="tpl-subject" value={t.subject ?? ""} onChange={(e) => set({ subject: e.target.value })} />
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-body">Texto</Label>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(TEMPLATE_VARS) as TemplateVar[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVar(v)}
                    className="rounded-md bg-primary-soft px-1.5 py-0.5 font-mono text-caption text-primary-ink-strong hover:bg-primary-soft-border"
                    title={`Ex.: ${TEMPLATE_VARS[v]}`}
                  >
                    {`{${v}}`}
                  </button>
                ))}
              </div>
              <Textarea id="tpl-body" ref={bodyRef} rows={11} value={t.body} onChange={(e) => set({ body: e.target.value })} className="text-sm leading-relaxed" />
              {t.channel === "email" ? (
                <p className="text-xs text-muted-foreground">Linha com “• ” vira destaque; “P.S.” no fim sai em cinza depois da assinatura.</p>
              ) : null}
            </div>
            <div className="rounded-xl border border-primary-soft-border bg-primary-soft p-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-primary-ink">
                <SparklesIcon className="size-4" aria-hidden />
                {t.body.trim() ? "Melhorar com IA" : "Escrever com IA"}
              </p>
              <Textarea rows={2} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Ex.: mais curto, sem parecer anúncio" className="bg-card" />
              <div className="mt-2 flex justify-end">
                <Button variant="outline" size="sm" onClick={improve} disabled={busy !== null}>
                  <WandSparklesIcon aria-hidden />
                  {busy === "ai" ? "Escrevendo…" : "Gerar versão"}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 bg-muted/30 p-5">
            <p className="text-[13px] font-medium text-muted-foreground">Prévia com dados de exemplo</p>
            <div className="rounded-xl border border-border bg-card">
              {t.channel === "email" ? (
                <p className="border-b px-4 py-2.5 text-[13px]">
                  <b>Assunto:</b> {renderTemplate(t.subject ?? "", TEMPLATE_VARS)}
                </p>
              ) : null}
              <p className="px-4 py-3.5 leading-relaxed whitespace-pre-line">{renderTemplate(t.body, TEMPLATE_VARS) || "…"}</p>
              {t.channel === "email" ? (
                <p className="px-4 pb-3.5 text-[13px]">
                  Um abraço,
                  <br />
                  <b>{TEMPLATE_VARS.remetente}</b>
                  <br />
                  <span className="text-muted-foreground">CEO · Falaped</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t px-6 py-3.5">
          <span className="text-[13px] text-muted-foreground">
            {t.id ? `${t.sent ?? 0} ${t.sent === 1 ? "envio" : "envios"} com este modelo. Editar não muda o que já foi enviado.` : "O modelo aparece no WhatsApp e no e-mail da ficha."}
          </span>
          <div className="flex gap-2">
            {t.id ? (
              <Button variant="ghost" onClick={() => save(true)} disabled={busy !== null}>
                Arquivar
              </Button>
            ) : null}
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => save()} disabled={busy !== null || !t.name.trim() || !t.body.trim()}>
              {busy === "save" ? "Salvando…" : "Salvar modelo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
