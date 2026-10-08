"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LockIcon } from "lucide-react"
import { toast } from "sonner"

import { createReportTemplateAction, updateReportTemplateAction } from "@/actions"
import { FormCard } from "@/components/dashboard/form-layout"
import { TemplateFormShell } from "@/components/dashboard/templates/template-form-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { createReportTemplateSchema } from "@/lib/schemas/report-template"
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
    <TemplateFormShell
      backHref={LIST_HREF}
      title={props.mode === "edit" ? `Editar ${props.initialName}` : "Novo modelo de relatório"}
      subtitle="As seções que o assistente preenche no relatório ao encerrar a consulta"
      suggestion={props.mode === "create" && props.aiPrompt && props.onRegenerate ? { prompt: props.aiPrompt, onRegenerate: props.onRegenerate } : undefined}
      isCreate={isCreate}
      isDirty={isDirty}
      missing={missing}
      changedLabel={changedLabel}
      saving={saving}
      onSave={save}
      onDiscard={() => {
        setName(initial.name)
        setSections(initial.sections)
      }}
      preview={
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
      }
    >
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
              <div className="text-caption text-muted-foreground">{FIXED_HINT[section.name]} Preenchida sozinha, sempre no começo.</div>
            </div>
          </div>
        ))}
        <ReportTemplateMiddleSectionsEditor sections={sections} onChange={setSections} />
      </FormCard>
    </TemplateFormShell>
  )
}
