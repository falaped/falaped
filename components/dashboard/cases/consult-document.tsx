"use client"

import { useEffect, useRef, useState } from "react"
import { EyeIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import type { ConsultDoctor } from "@/components/dashboard/cases/consult-prescription-panel"
import { Button } from "@/components/ui/button"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAge } from "@/lib/format-pediatric-age"
import { formatDate } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"

type PdfResult = { ok: true; pdfBase64: string; filename: string } | { ok: false; error: string }

/** Rodapé fixo dos painéis: ações secundárias à esquerda, a principal com `ml-auto`. */
export function PanelFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 items-center gap-2 border-t border-border px-6 py-3">{children}</div>
}

/**
 * Painel de documento (protótipo a6/a7): formulário em passos à esquerda e a folha ao vivo
 * à direita. Abaixo de lg a prévia some e o formulário ocupa tudo.
 */
export function DocLayout({ form, preview }: { form: React.ReactNode; preview: React.ReactNode }) {
  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex flex-col gap-7 overflow-auto px-6 py-6">{form}</div>
      <div className="hidden overflow-auto border-l border-border bg-muted px-6 py-6 lg:block">
        <p className="mb-3 flex items-center gap-2 text-caption text-subtle-foreground">
          <EyeIcon className="size-3.5" aria-hidden />
          Prévia · muda enquanto você preenche
        </p>
        {preview}
      </div>
    </div>
  )
}

/** Passo numerado do formulário: deixa claro o que vem primeiro. */
export function DocStep({
  n,
  title,
  aside,
  children,
}: {
  n: number
  title: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span className="num grid size-6 place-items-center rounded-full bg-primary-soft text-caption font-semibold text-primary-ink-strong">
          {n}
        </span>
        <h3 className="font-display text-title font-semibold">{title}</h3>
        {aside ? <div className="ml-auto text-caption text-subtle-foreground">{aside}</div> : null}
      </div>
      {children}
    </section>
  )
}

/** Atalho "+ Algo" que revela um campo opcional. */
export function AddFieldButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="sm" className="w-fit text-muted-foreground" onClick={onClick}>
      <PlusIcon data-icon="inline-start" />
      {children}
    </Button>
  )
}

/** Pílula de escolha (modelo, painel, especialidade). */
export function ChoiceChip({
  selected = false,
  onClick,
  children,
}: {
  selected?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-label",
        selected ? "border-primary bg-primary-soft font-semibold text-primary-ink-strong" : "border-border hover:bg-accent",
      )}
    >
      {children}
    </button>
  )
}

/**
 * Folha A4 em miniatura com o cabeçalho e a assinatura do pediatra. Quando o conteúdo não
 * cabe, marca a quebra e avisa por `onPagesChange` quantas folhas vão sair.
 * ponytail: só a prévia segue o protótipo; o PDF do falaped-kit ainda tem outro layout, então
 * a contagem de páginas é estimada pela prévia (e só mede em lg+, onde a prévia aparece).
 */
export function DocPaper({
  doctor,
  patient,
  title,
  onPagesChange,
  children,
}: {
  doctor: ConsultDoctor
  patient: { name: string; birth_date: string | null }
  title: string
  onPagesChange?: (pages: number) => void
  children: React.ReactNode
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState(1)
  useEffect(() => {
    const box = boxRef.current
    const content = contentRef.current
    if (!box || !content) return
    const observer = new ResizeObserver(() => {
      const room = box.clientHeight
      setPages(room ? Math.max(1, Math.ceil(content.scrollHeight / room)) : 1)
    })
    observer.observe(box)
    observer.observe(content)
    return () => observer.disconnect()
  }, [])
  useEffect(() => onPagesChange?.(pages), [pages, onPagesChange])

  const name = [doctor.first_name, doctor.surname].filter(Boolean).join(" ")
  const registry = [doctor.crm && `CRM ${doctor.crm}`, doctor.rqe && `RQE ${doctor.rqe}`].filter(Boolean).join(" · ")
  const place = [doctor.default_location_city, doctor.default_location_state].filter(Boolean).join(" · ")
  const age = formatPediatricAge(computePediatricAge(patient.birth_date))
  const today = formatDate(new Date())
  return (
    <div className="mx-auto flex aspect-[1/1.414] w-full flex-col rounded-md bg-white p-7 text-[8.5px] leading-relaxed text-neutral-700 shadow-md">
      <div className="flex items-end justify-between gap-2 border-b border-neutral-300 pb-2">
        <div>
          <div className="text-[10px] font-bold text-neutral-900">{name}</div>
          <div>{["Pediatria", registry].filter(Boolean).join(" · ")}</div>
        </div>
        <div className="text-right">{place}</div>
      </div>
      <div className="mt-4 text-center text-[10px] font-bold tracking-[0.12em] text-neutral-900 uppercase">{title}</div>
      <div className="mt-3">
        Paciente: <b className="text-neutral-900">{patient.name}</b>
        {age ? ` · ${age}` : null}
      </div>
      <div ref={boxRef} className="relative mt-3 min-h-0 flex-1 overflow-hidden">
        <div ref={contentRef} className="space-y-2">
          {children}
        </div>
        {pages > 1 ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/90 pt-6 text-center font-semibold text-neutral-500">
            Continua na página 2 · {pages} páginas
          </div>
        ) : null}
      </div>
      <div className="mx-auto mt-4 w-40 border-t border-neutral-400 pt-1 text-center">
        {name}
        <br />
        {[doctor.default_location_city, today].filter(Boolean).join(", ")}
      </div>
    </div>
  )
}

/**
 * "Emitir e download": gera o PDF e baixa direto. O aviso de sucesso oferece "Baixar de novo".
 * Devolve true quando emitiu.
 * ponytail: a URL do PDF não é revogada (o "Baixar de novo" depende dela).
 */
export async function emitAndDownloadPdf(generate: () => Promise<PdfResult>, successMessage: string): Promise<boolean> {
  const result = await generate().catch(() => ({ ok: false, error: "Não foi possível gerar o PDF." }) as const)
  if (!result.ok) {
    toast.error(getFriendlyToastMessage(result.error))
    return false
  }
  const url = URL.createObjectURL(
    new Blob([Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0))], { type: "application/pdf" }),
  )
  const download = () => {
    const link = document.createElement("a")
    link.href = url
    link.download = result.filename
    link.click()
  }
  download()
  toast.success(successMessage, { action: { label: "Baixar de novo", onClick: download } })
  return true
}
