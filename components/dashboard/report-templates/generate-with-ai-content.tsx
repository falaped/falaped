"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeftIcon, Loader2Icon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { generateReportTemplateSectionsAction } from "@/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import type { ReportTemplateSection } from "@/modules/report-templates/get-report-template-by-id"
import { ReportTemplateForm } from "./report-template-form"

const MAX = 1000
const EXAMPLES = ["Retorno de doença aguda", "Primeira consulta do recém-nascido", "Avaliação de TDAH com escalas"]

/**
 * Gerar modelo com IA (protótipo g5/g4a): uma frase vira nome e seções, que abrem na página
 * do modelo para revisar. Nada é salvo antes de "Criar modelo".
 */
export function GenerateWithAiContent() {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<{ prompt: string; name: string; sections: ReportTemplateSection[] } | null>(null)

  async function generate() {
    const trimmed = prompt.trim()
    if (!trimmed) return void toast.error("Descreva o relatório que você quer.")
    setLoading(true)
    const result = await generateReportTemplateSectionsAction(trimmed)
    setLoading(false)
    if (!result.ok) return void toast.error(getFriendlyToastMessage(result.error))
    setSuggestion({ prompt: trimmed, name: result.suggestedName, sections: result.sections })
  }

  if (suggestion) {
    return (
      <ReportTemplateForm
        key={`${suggestion.prompt}-${suggestion.name}`}
        mode="create"
        initialName={suggestion.name}
        initialTemplateSections={suggestion.sections}
        aiPrompt={suggestion.prompt}
        onRegenerate={() => setSuggestion(null)}
      />
    )
  }

  return (
    <div className="flex w-full max-w-[1440px] flex-col">
      <Button asChild variant="ghost" size="sm" className="-ml-2.5 mb-2 self-start text-muted-foreground">
        <Link href="/dashboard/templates?aba=relatorio">
          <ArrowLeftIcon data-icon="inline-start" />
          Voltar aos modelos
        </Link>
      </Button>
      <section className="mx-auto mt-6 w-full max-w-[760px] rounded-xl border border-primary-soft-border bg-highlight p-8 shadow-sm">
        <span className="grid size-10 place-items-center rounded-xl bg-card text-primary-ink-strong">
          <SparklesIcon className="size-5" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-page font-semibold">Como você quer o relatório?</h1>
        <p className="mt-1 text-muted-foreground">
          Descreva em uma frase. O assistente sugere o nome e as seções, e você revisa antes de salvar.
        </p>
        <Textarea
          aria-label="Descreva o relatório"
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void generate()
          }}
          placeholder="Ex.: consulta de puericultura com alimentação, sono e marcos do desenvolvimento"
          maxLength={MAX}
          disabled={loading}
          className="mt-5 min-h-24 resize-none bg-card text-read"
        />
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-caption text-subtle-foreground">Exemplos:</span>
          {EXAMPLES.map((example) => (
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
          <Button onClick={generate} disabled={loading}>
            {loading ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : <SparklesIcon data-icon="inline-start" />}
            {loading ? "Gerando…" : "Gerar sugestão"}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard/templates?aba=relatorio">Cancelar</Link>
          </Button>
          <span className="num ml-auto text-caption text-subtle-foreground">
            {prompt.length}/{MAX}
          </span>
        </div>
      </section>
    </div>
  )
}
