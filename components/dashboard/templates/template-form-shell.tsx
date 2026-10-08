"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeftIcon, EyeIcon, Loader2Icon, RefreshCwIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"

export type TemplateSuggestion = { prompt: string; onRegenerate: () => void }

/**
 * Moldura das páginas de criar/editar modelo (protótipo g4, g6, g7): Voltar, cabeçalho,
 * aviso da sugestão da IA, cartões à esquerda, prévia à direita e a barra de salvar única
 * (criar diz o que falta; editar só aparece com mudança e pergunta antes de sair).
 */
export function TemplateFormShell({
  backHref,
  title,
  subtitle,
  suggestion,
  suggestionNote,
  isCreate,
  isDirty,
  missing,
  changedLabel,
  saving,
  onSave,
  onDiscard,
  preview,
  children,
}: {
  backHref: string
  title: string
  subtitle: string
  suggestion?: TemplateSuggestion
  /** O que o médico precisa conferir na sugestão. */
  suggestionNote?: string
  isCreate: boolean
  isDirty: boolean
  /** "o nome", "pelo menos um exame"… vazio = pronto para salvar. */
  missing: string[]
  /** "o nome e os exames". */
  changedLabel: string
  saving: boolean
  onSave: () => void
  onDiscard: () => void
  preview: React.ReactNode
  children: React.ReactNode
}) {
  // ponytail: só o navegador, como na ficha; os links do menu não perguntam.
  useEffect(() => {
    if (isCreate || !isDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [isCreate, isDirty])

  return (
    <div className="flex w-full max-w-[1440px] flex-col">
      <Button asChild variant="ghost" size="sm" className="-ml-2.5 mb-2 self-start text-muted-foreground">
        <Link href={backHref}>
          <ArrowLeftIcon data-icon="inline-start" />
          Voltar aos modelos
        </Link>
      </Button>

      <section className="flex items-center gap-5 rounded-xl border border-primary-soft-border bg-highlight p-6 shadow-sm">
        <div className="min-w-0">
          <h1 className="font-display text-page font-semibold">{title}</h1>
          <div className="mt-1 text-muted-foreground">{subtitle}</div>
        </div>
        {suggestion ? (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={suggestion.onRegenerate}>
            <RefreshCwIcon data-icon="inline-start" />
            Gerar de novo
          </Button>
        ) : null}
      </section>

      {suggestion ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning-border bg-warning-soft px-4 py-3">
          <SparklesIcon className="mt-0.5 size-4 shrink-0 text-warning-text" aria-hidden />
          <span className="min-w-0 flex-1">
            Sugestão do assistente para <b>&ldquo;{suggestion.prompt}&rdquo;</b>. {suggestionNote ?? "Revise antes de salvar."}
          </span>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-[minmax(0,880px)_minmax(0,1fr)] items-start gap-8">
        <div className="flex flex-col gap-6">
          {children}

          {isCreate || isDirty ? (
            <div className="sticky bottom-6 z-20 flex items-center gap-3 rounded-2xl border border-border bg-popover px-4 py-3 shadow-lg">
              <span
                className={cn("size-2 rounded-full", isCreate ? (missing.length ? "bg-danger-text" : "bg-success") : "bg-warning")}
                aria-hidden
              />
              <span className="flex-1" aria-live="polite">
                {isCreate ? (missing.length ? `Falta ${missing.join(" e ")}` : "Pronto para salvar") : `Você alterou ${changedLabel}`}
              </span>
              {isCreate ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={backHref}>Cancelar</Link>
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={onDiscard}>
                  Descartar
                </Button>
              )}
              <Button size="sm" disabled={saving || missing.length > 0} onClick={onSave}>
                {saving ? "Salvando…" : isCreate ? "Criar modelo" : "Salvar alterações"}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="sticky top-6">
          <div className="mb-3 flex items-center gap-2 text-caption text-subtle-foreground">
            <EyeIcon className="size-3.5" aria-hidden />
            Prévia · como sai ao usar
          </div>
          {preview}
        </div>
      </div>
    </div>
  )
}

/**
 * "Gerar com IA" (protótipo g5, g8): uma frase com exemplos; a sugestão abre no formulário.
 * `generate` devolve o erro já em PT-BR ou null quando deu certo.
 */
export function TemplatePrompt({
  backHref,
  title,
  description,
  placeholder,
  examples,
  maxLength,
  generate,
}: {
  backHref: string
  title: string
  description: string
  placeholder: string
  examples: string[]
  maxLength: number
  generate: (prompt: string) => Promise<string | null>
}) {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit() {
    const trimmed = prompt.trim()
    if (!trimmed) return void toast.error("Escreva o que você quer.")
    setLoading(true)
    const error = await generate(trimmed)
    setLoading(false)
    if (error) toast.error(getFriendlyToastMessage(error))
  }

  return (
    <div className="flex w-full max-w-[1440px] flex-col">
      <Button asChild variant="ghost" size="sm" className="-ml-2.5 mb-2 self-start text-muted-foreground">
        <Link href={backHref}>
          <ArrowLeftIcon data-icon="inline-start" />
          Voltar aos modelos
        </Link>
      </Button>
      <section className="mx-auto mt-6 w-full max-w-[760px] rounded-xl border border-primary-soft-border bg-highlight p-8 shadow-sm">
        <span className="grid size-10 place-items-center rounded-xl bg-card text-primary-ink-strong">
          <SparklesIcon className="size-5" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-page font-semibold">{title}</h1>
        <p className="mt-1 text-muted-foreground">{description}</p>
        <Textarea
          aria-label={title}
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit()
          }}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={loading}
          className="mt-5 min-h-20 resize-none bg-card text-read"
        />
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-caption text-subtle-foreground">Exemplos:</span>
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              disabled={loading}
              onClick={() => setPrompt(example)}
              className="h-7 rounded-full border border-border bg-card px-3 text-label hover:bg-accent"
            >
              {example}
            </button>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={submit} disabled={loading}>
            {loading ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : <SparklesIcon data-icon="inline-start" />}
            {loading ? "Gerando…" : "Gerar sugestão"}
          </Button>
          <Button asChild variant="ghost">
            <Link href={backHref}>Cancelar</Link>
          </Button>
          <span className="num ml-auto text-caption text-subtle-foreground">
            {prompt.length}/{maxLength}
          </span>
        </div>
      </section>
    </div>
  )
}
