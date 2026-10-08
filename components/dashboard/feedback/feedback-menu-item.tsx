"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { BugIcon, CheckIcon, HeartIcon, LightbulbIcon, Loader2Icon, MapPinIcon, MessageSquareHeartIcon, SendIcon } from "lucide-react"
import { toast } from "sonner"

import { sendFeedbackAction } from "@/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { Textarea } from "@/components/ui/textarea"
import { FEEDBACK_KIND_LABEL, FEEDBACK_MAX, feedbackPageLabel, type FeedbackKind } from "@/lib/feedback"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"

const KINDS: { kind: FeedbackKind; icon: typeof BugIcon; label: string; placeholder: string }[] = [
  { kind: "sugestao", icon: LightbulbIcon, label: "O que você gostaria?", placeholder: "Ex.: queria imprimir a curva de crescimento junto com o relatório" },
  { kind: "problema", icon: BugIcon, label: "O que aconteceu?", placeholder: "Conte o que você tentou fazer e o que aconteceu" },
  { kind: "elogio", icon: HeartIcon, label: "O que você gostou?", placeholder: "Conte o que está ajudando no seu dia" },
]

/** Item "Enviar feedback" do menu e o modal que ele abre (protótipo j1). A tela de origem vai junto. */
export function FeedbackMenuItem() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<FeedbackKind>("sugestao")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const current = KINDS.find((k) => k.kind === kind)!

  function handleOpenChange(next: boolean) {
    setOpen(next)
    // Reabrir depois de enviar começa do zero; fechar sem enviar guarda o rascunho.
    if (!next && sent) {
      setSent(false)
      setMessage("")
      setKind("sugestao")
    }
  }

  async function send() {
    setSending(true)
    const result = await sendFeedbackAction({ kind, message, page: pathname })
    setSending(false)
    if (!result.ok) return void toast.error(getFriendlyToastMessage(result.error))
    setSent(true)
  }

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Enviar feedback" onClick={() => setOpen(true)}>
          <MessageSquareHeartIcon />
          <span>Enviar feedback</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="gap-0 p-0 sm:max-w-[560px]">
          {sent ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-success-soft text-success-text">
                <CheckIcon aria-hidden />
              </span>
              <DialogTitle className="font-display text-section font-semibold">Recebemos, obrigado!</DialogTitle>
              <DialogDescription className="max-w-sm">
                Cada mensagem é lida pela equipe do Falaped. Se precisarmos entender melhor, chamamos você no WhatsApp.
              </DialogDescription>
              <Button className="mt-2" onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader className="border-b border-border px-6 py-5 text-left">
                <DialogTitle className="font-display text-section font-semibold">Ajude a melhorar o Falaped</DialogTitle>
                <DialogDescription>O que podemos fazer melhor? Cada mensagem é lida pela equipe.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-5 px-6 py-5">
                <div className="flex flex-col gap-1.5">
                  <span className="text-label font-medium">Sobre o quê?</span>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de feedback">
                    {KINDS.map((k) => (
                      <button
                        key={k.kind}
                        type="button"
                        role="radio"
                        aria-checked={kind === k.kind}
                        onClick={() => setKind(k.kind)}
                        className={cn(
                          "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-label transition-colors",
                          kind === k.kind
                            ? "border-primary-soft-border bg-primary-soft font-semibold text-primary-ink-strong"
                            : "border-border bg-card text-muted-foreground hover:bg-accent",
                        )}
                      >
                        <k.icon className="size-4" aria-hidden />
                        {FEEDBACK_KIND_LABEL[k.kind]}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-label font-medium">{current.label}</span>
                  <Textarea
                    autoFocus
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={current.placeholder}
                    maxLength={FEEDBACK_MAX}
                    disabled={sending}
                    className="min-h-32 resize-none text-read"
                  />
                </label>
                <p className="flex items-center gap-2 text-caption text-subtle-foreground">
                  <MapPinIcon className="size-3.5" aria-hidden />
                  Enviado de: {feedbackPageLabel(pathname)} · vai junto para entendermos o contexto
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
                <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={send} disabled={sending || !message.trim()}>
                  {sending ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
                  {sending ? "Enviando…" : "Enviar"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
