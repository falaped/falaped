"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, EyeIcon, LockIcon, RefreshCwIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { createReportTemplateAction, updateReportTemplateAction } from "@/actions"
import { FormCard } from "@/components/dashboard/form-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { createReportTemplateSchema } from "@/lib/schemas/report-template"
import { cn } from "@/lib/utils"
import type { ReportTemplateSection } from "@/modules/report-templates/get-report-template-by-id"
import {
  buildFixedTemplateSections,
  mergeEditorTemplateSections,
  splitNormalizedTemplateSectionsForEditor,
} from "@/modules/report-templates/fixed-template-sections"
import { ReportTemplateMiddleSectionsEditor, type ReportTemplateSectionInput } from "./report-template-sections-editor"

const LIST_HREF = "/dashboard/templates?aba=relatorio"

const FIXED_HINT: Record<string, string> = {
  Paciente: "Nome, idade, peso e responsável.",
  "Dados clínicos": "Medidas, escalas e exames lidos na consulta.",
}

type ReportTemplateFormProps =
  | {
      mode: "create"
      initialName?: string
      /** Seções vindas do banco (Duplicar) ou do Gerar com IA, com as fixas. */
      initialTemplateSections?: ReportTemplateSection[]
      /** O que foi pedido ao assistente; mostra o aviso e "Gerar de novo". */
      aiPrompt?: string
      onRegenerate?: () => void
    }
  | {
      mode: "edit"
      templateId: string
      initialName: string
      initialTemplateSections: ReportTemplateSection[]
    }

const toInput = (s: ReportTemplateSection): ReportTemplateSectionInput => ({ name: s.name ?? "", description: s.description ?? "" })

/**
 * Criar ou editar o modelo de relatório (protótipo g4/g4e/g4a): cartões à esquerda, prévia à
 * direita e a barra de salvar única (criar diz o que falta; editar só aparece com mudança).
 */
export function ReportTemplateForm(props: ReportTemplateFormProps) {
  const router = useRouter()
  const isCreate = props.mode === "create"
  const fixed = useMemo(() => buildFixedTemplateSections(), [])
  const initial = useMemo(
    () => ({
      name: props.initialName ?? "",
      sections: splitNormalizedTemplateSectionsForEditor(props.initialTemplateSections ?? []).middle.map(toInput),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valores iniciais, só na montagem
    [],
  )
  const [name, setName] = useState(initial.name)
  const [sections, setSections] = useState(initial.sections)
  const [saving, setSaving] = useState(false)

  const named = sections.filter((s) => s.name.trim())
  const nameChanged = name.trim() !== initial.name.trim()
  const sectionsChanged = JSON.stringify(sections) !== JSON.stringify(initial.sections)
  const isDirty = nameChanged || sectionsChanged
  const missing = [!name.trim() && "o nome", !named.length && "pelo menos uma seção"].filter(Boolean) as string[]

  // Sair sem salvar pergunta antes (recarregar, fechar a aba).
  // ponytail: só o navegador, como na ficha; os links do menu não perguntam.
  useEffect(() => {
    if (isCreate || !isDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [isCreate, isDirty])

  async function save() {
    const parsed = createReportTemplateSchema.safeParse({
      name: name.trim(),
      sections: mergeEditorTemplateSections(named.map((s) => ({ name: s.name.trim(), description: s.description.trim() || undefined }))),
    })
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? "Confira o nome e as seções.")
    setSaving(true)
    const result =
      props.mode === "create"
        ? await createReportTemplateAction(parsed.data)
        : await updateReportTemplateAction(props.templateId, parsed.data)
    setSaving(false)
    if (!result.ok) return void toast.error(getFriendlyToastMessage(result.error))
    toast.success(isCreate ? "Modelo criado." : "Modelo atualizado.")
    router.push(LIST_HREF)
    router.refresh()
  }

  const changedLabel = [nameChanged && "o nome", sectionsChanged && "as seções"].filter(Boolean).join(" e ")
  const previewSections = [...fixed.map((s) => s.name), ...named.map((s) => s.name.trim())]

  return (
    <div className="flex w-full max-w-[1440px] flex-col">
      <Button asChild variant="ghost" size="sm" className="-ml-2.5 mb-2 self-start text-muted-foreground">
        <Link href={LIST_HREF}>
          <ArrowLeftIcon data-icon="inline-start" />
          Voltar aos modelos
        </Link>
      </Button>

      <section className="flex items-center gap-5 rounded-xl border border-primary-soft-border bg-highlight p-6 shadow-sm">
        <div className="min-w-0">
          <h1 className="font-display text-page font-semibold">
            {props.mode === "edit" ? `Editar ${props.initialName}` : "Novo modelo de relatório"}
          </h1>
          <div className="mt-1 text-muted-foreground">As seções que o assistente preenche no relatório ao encerrar a consulta</div>
        </div>
        {props.mode === "create" && props.onRegenerate ? (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={props.onRegenerate}>
            <RefreshCwIcon data-icon="inline-start" />
            Gerar de novo
          </Button>
        ) : null}
      </section>

      {props.mode === "create" && props.aiPrompt ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary-soft-border bg-primary-soft px-4 py-3">
          <SparklesIcon className="size-4 shrink-0 text-primary-ink-strong" aria-hidden />
          <span className="min-w-0 flex-1">
            Sugestão do assistente para <b>&ldquo;{props.aiPrompt}&rdquo;</b>. Revise e salve.
          </span>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-[minmax(0,880px)_minmax(0,1fr)] items-start gap-8">
        <div className="flex flex-col gap-6">
          <FormCard id="nome" title="Nome" description="Aparece na lista de modelos.">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="template-name">Nome do modelo</Label>
              <Input
                id="template-name"
                value={name}
                maxLength={200}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Puericultura, Retorno de doença aguda"
              />
            </div>
          </FormCard>

          <FormCard id="secoes" title="Seções" description="Na ordem em que saem no relatório. Arraste para reordenar.">
            {fixed.map((section) => (
              <div key={section.name} className="flex items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3">
                <LockIcon className="size-4 text-subtle-foreground" aria-hidden />
                <div>
                  <div className="font-semibold">{section.name}</div>
                  <div className="text-caption text-muted-foreground">
                    {FIXED_HINT[section.name]} Preenchida sozinha, sempre no começo.
                  </div>
                </div>
              </div>
            ))}
            <ReportTemplateMiddleSectionsEditor sections={sections} onChange={setSections} />
          </FormCard>

          {isCreate || isDirty ? (
            <div className="sticky bottom-6 z-20 flex items-center gap-3 rounded-2xl border border-border bg-popover px-4 py-3 shadow-lg">
              <span
                className={cn("size-2 rounded-full", isCreate ? (missing.length ? "bg-danger-text" : "bg-success") : "bg-warning")}
                aria-hidden
              />
              <span className="flex-1" aria-live="polite">
                {isCreate
                  ? missing.length
                    ? `Falta ${missing.join(" e ")}`
                    : "Pronto para salvar"
                  : `Você alterou ${changedLabel}`}
              </span>
              {isCreate ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={LIST_HREF}>Cancelar</Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setName(initial.name)
                    setSections(initial.sections)
                  }}
                >
                  Descartar
                </Button>
              )}
              <Button size="sm" disabled={saving || missing.length > 0} onClick={save}>
                {saving ? "Salvando…" : isCreate ? "Criar modelo" : "Salvar alterações"}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="sticky top-6">
          <div className="mb-3 flex items-center gap-2 text-caption text-subtle-foreground">
            <EyeIcon className="size-3.5" aria-hidden />
            Prévia · como o relatório sai
          </div>
          <div className="flex aspect-[1/1.414] w-full flex-col gap-3 overflow-hidden rounded-md bg-white p-7 text-[11px] leading-relaxed text-neutral-700 shadow-md">
            <div className="text-center font-semibold tracking-[0.2em] text-neutral-900">RELATÓRIO DA CONSULTA</div>
            {previewSections.map((section, index) => (
              <div key={`${section}-${index}`}>
                <div className="font-semibold text-neutral-900">{section}</div>
                <div className="mt-1 h-2 w-full rounded bg-neutral-200" />
                <div className="mt-1 h-2 w-2/3 rounded bg-neutral-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
