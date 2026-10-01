"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, CheckIcon, ChevronRightIcon, PhoneIcon, XCircleIcon } from "lucide-react"
import { toast } from "sonner"

import { addProspectNoteAction, recordProspectTouchAction, undoProspectTouchAction, updateProspectAction, type UpdateProspectInput } from "@/actions"
import { STAGE_LABEL, type FunnelStage } from "@/lib/funnel"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/** Salva um patch do prospect e atualiza a página; devolve se deu certo. */
function useSave(id: string) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const save = async (patch: UpdateProspectInput, done?: string) => {
    setSaving(true)
    try {
      const r = await updateProspectAction(id, patch)
      if (!r.ok) {
        toast.error(r.error)
        return false
      }
      if (done) toast.success(done)
      router.refresh()
      return true
    } finally {
      setSaving(false)
    }
  }
  return { save, saving }
}

const MANUAL = ["novo", "contatado", "respondeu"] as const
const AUTO = ["em-teste", "cliente"] as const

/** Etapas: as manuais se clicam; Em teste e Cliente acendem sozinhas pela conta. */
export function StageStepper({ id, stage }: { id: string; stage: FunnelStage }) {
  const { save, saving } = useSave(id)
  const [reason, setReason] = React.useState("")
  const [lostOpen, setLostOpen] = React.useState(false)
  const order: FunnelStage[] = [...MANUAL, ...AUTO]
  const at = order.indexOf(stage)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {order.map((s, i) => {
        const auto = (AUTO as readonly string[]).includes(s)
        const done = at > i
        const current = stage === s
        return (
          <React.Fragment key={s}>
            {i > 0 ? <ChevronRightIcon className="size-4 text-muted-foreground/50" aria-hidden /> : null}
            <button
              type="button"
              disabled={auto || saving || current}
              onClick={() => save({ status: s as (typeof MANUAL)[number] }, `Etapa: ${STAGE_LABEL[s]}.`)}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] ring-1 ring-border transition-colors",
                done && "bg-primary/10 text-primary-ink ring-primary/30",
                current && "bg-primary/20 font-semibold text-primary-ink ring-2 ring-primary",
                !done && !current && !auto && "hover:ring-primary/60",
                auto && !current && "text-muted-foreground/70",
              )}
              title={auto ? "Muda sozinha quando a pessoa cria conta ou paga" : undefined}
            >
              {done ? <CheckIcon className="size-3.5" aria-hidden /> : null}
              {STAGE_LABEL[s]}
            </button>
          </React.Fragment>
        )
      })}
      <span className="flex-1" />
      {stage === "perdido" ? (
        <Button variant="outline" size="sm" disabled={saving} onClick={() => save({ status: "contatado" }, "Voltou para Contatado.")}>
          Reabrir
        </Button>
      ) : !(AUTO as readonly string[]).includes(stage) ? (
        <Popover open={lostOpen} onOpenChange={setLostOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="text-orange-700 hover:text-orange-700 dark:text-orange-400">
              <XCircleIcon aria-hidden />
              Marcar como perdido
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <form
              className="flex flex-col gap-2"
              onSubmit={async (e) => {
                e.preventDefault()
                if (await save({ status: "perdido", lost_reason: reason.trim() }, "Marcado como perdido.")) setLostOpen(false)
              }}
            >
              <Label htmlFor="lost-reason">Motivo</Label>
              <Input id="lost-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: já usa outro sistema" autoFocus />
              <Button type="submit" size="sm" disabled={saving}>
                Marcar como perdido
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  )
}

/** Campo de nota no topo da linha do tempo. */
export function NoteComposer({ id }: { id: string }) {
  const router = useRouter()
  const [text, setText] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  return (
    <form
      className="mb-4 flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!text.trim()) return
        setSaving(true)
        const r = await addProspectNoteAction(id, text)
        setSaving(false)
        if (!r.ok) return void toast.error(r.error)
        setText("")
        router.refresh()
      }}
    >
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma nota: o que conversaram, objeções, próximos passos…" aria-label="Nota" />
      <Button type="submit" disabled={saving || !text.trim()}>
        Salvar nota
      </Button>
    </form>
  )
}

const plusDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

/** Atalhos de próximo contato (9h do dia) e data livre. */
export function NextContactButtons({ id, value }: { id: string; value: string | null }) {
  const { save, saving } = useSave(id)
  const day = value ? new Date(value).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) : ""
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {[
        ["Amanhã", 1],
        ["+3 dias", 3],
        ["+7 dias", 7],
      ].map(([label, n]) => (
        <Button key={label} variant="outline" size="sm" disabled={saving} onClick={() => save({ next_contact_at: plusDays(n as number) }, "Próximo contato marcado.")}>
          {label}
        </Button>
      ))}
      <label className="relative flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted" title="Escolher data">
        <CalendarIcon className="size-4" aria-hidden />
        <input
          type="date"
          aria-label="Escolher data"
          defaultValue={day}
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => e.target.value && save({ next_contact_at: new Date(`${e.target.value}T09:00:00-03:00`).toISOString() }, "Próximo contato marcado.")}
        />
      </label>
      {value ? (
        <Button variant="ghost" size="sm" disabled={saving} onClick={() => save({ next_contact_at: null }, "Sem próximo contato.")}>
          Limpar
        </Button>
      ) : null}
    </div>
  )
}

type ContactFields = { full_name: string; email: string; phone: string; crm: string; clinic: string; city: string }

/** Contato editável (nome, e-mail, celular, CRM, clínica, cidade). */
export function ContactForm({ id, initial }: { id: string; initial: ContactFields }) {
  const { save, saving } = useSave(id)
  const [fields, setFields] = React.useState(initial)
  const dirty = (Object.keys(initial) as (keyof ContactFields)[]).some((k) => fields[k] !== initial[k])
  const field = (key: keyof ContactFields, label: string, type = "text") => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`c-${key}`} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input id={`c-${key}`} type={type} value={fields[key]} onChange={(e) => setFields({ ...fields, [key]: e.target.value })} />
    </div>
  )
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        save(fields, "Contato salvo.")
      }}
    >
      {field("full_name", "Nome")}
      {field("email", "E-mail", "email")}
      {field("phone", "Celular (WhatsApp)")}
      <div className="grid grid-cols-2 gap-3">
        {field("crm", "CRM")}
        {field("city", "Cidade")}
      </div>
      {field("clinic", "Clínica")}
      <Button type="submit" variant="outline" disabled={!dirty || saving} className="self-start">
        Salvar contato
      </Button>
    </form>
  )
}

/** Ligação feita: entra na linha do tempo e empurra o próximo contato (+7 dias), com desfazer. */
export function CallButton({ id }: { id: string }) {
  const router = useRouter()
  return (
    <Button
      variant="outline"
      onClick={async () => {
        const r = await recordProspectTouchAction(id, { channel: "telefone", detail: null })
        if (!r.ok) return void toast.error(r.error)
        router.refresh()
        toast.success("Ligação registrada.", {
          action: {
            label: "Desfazer",
            onClick: async () => {
              const u = await undoProspectTouchAction(r.undo)
              if (!u.ok) toast.error(u.error)
              router.refresh()
            },
          },
        })
      }}
    >
      <PhoneIcon aria-hidden />
      Registrar ligação
    </Button>
  )
}
