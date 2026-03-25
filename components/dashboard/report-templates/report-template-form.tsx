"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  ReportTemplateFixedSectionCard,
  ReportTemplateMiddleSectionsEditor,
  type ReportTemplateSectionInput,
} from "./report-template-sections-editor"
import {
  createReportTemplateSchema,
  type CreateReportTemplateFormData,
} from "@/lib/schemas/report-template"
import { createReportTemplateAction, updateReportTemplateAction } from "@/actions"
import type { ReportTemplateSection } from "@/modules/report-templates/get-report-template-by-id"
import {
  buildFixedTemplateSections,
  mergeEditorTemplateSections,
  splitNormalizedTemplateSectionsForEditor,
} from "@/modules/report-templates/fixed-template-sections"

const reportTemplateNameSchema = z.object({
  name: z
    .string()
    .min(1, "Nome do template é obrigatório")
    .max(200, "Use no máximo 200 caracteres"),
})

type ReportTemplateNameForm = z.infer<typeof reportTemplateNameSchema>

type ReportTemplateFormProps =
  | {
      mode: "create"
      initialName?: string
      /** Full sections from DB or from “Gerar com IA” (includes fixed slots). */
      initialTemplateSections?: ReportTemplateSection[]
    }
  | {
      mode: "edit"
      templateId: string
      initialName: string
      initialTemplateSections: ReportTemplateSection[]
    }

function toSectionInput(s: ReportTemplateSection): ReportTemplateSectionInput {
  return {
    name: s.name ?? "",
    description: s.description ?? "",
  }
}

export function ReportTemplateForm(props: ReportTemplateFormProps) {
  const router = useRouter()

  const fixedCanonical = useMemo(() => buildFixedTemplateSections(), [])

  const initialName =
    props.mode === "edit" ? props.initialName : (props.initialName ?? "")

  const initialTemplateSections: ReportTemplateSection[] | undefined =
    props.mode === "create"
      ? props.initialTemplateSections
      : props.initialTemplateSections

  const { middle: initialMiddle } = splitNormalizedTemplateSectionsForEditor(
    initialTemplateSections ?? [],
  )

  const [middleSections, setMiddleSections] = useState<
    ReportTemplateSectionInput[]
  >(() =>
    initialMiddle.length > 0
      ? initialMiddle.map(toSectionInput)
      : [],
  )

  const form = useForm<ReportTemplateNameForm>({
    resolver: zodResolver(reportTemplateNameSchema),
    defaultValues: {
      name: initialName,
    },
  })

  async function onSubmit(data: ReportTemplateNameForm) {
    const middlePayload = middleSections
      .map((s) => ({
        name: s.name.trim(),
        description: s.description.trim() || undefined,
      }))
      .filter((s) => s.name.length > 0)

    const merged = mergeEditorTemplateSections(middlePayload)

    const payload: CreateReportTemplateFormData = {
      name: data.name,
      sections: merged,
    }

    const parsed = createReportTemplateSchema.safeParse(payload)
    if (!parsed.success) {
      const { fieldErrors } = z.flattenError(parsed.error)
      const msg = Object.values(fieldErrors).flat().find(Boolean)
      toast.error(msg ?? "Verifique os dados do template.")
      return
    }

    if (props.mode === "create") {
      const result = await createReportTemplateAction(parsed.data)
      if (result.ok) {
        toast.success("Template criado.")
        router.push("/dashboard/report-templates")
        router.refresh()
        return
      }
      toast.error(getFriendlyToastMessage(result.error))
      return
    }

    const result = await updateReportTemplateAction(props.templateId, parsed.data)
    if (result.ok) {
      toast.success("Template atualizado.")
      router.push("/dashboard/report-templates")
      router.refresh()
      return
    }
    toast.error(getFriendlyToastMessage(result.error))
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Field data-invalid={!!form.formState.errors.name}>
        <FieldLabel htmlFor="name">Nome do template</FieldLabel>
        <FieldContent>
          <Input
            id="name"
            placeholder="Ex.: Relatório pediátrico padrão"
            aria-invalid={!!form.formState.errors.name}
            {...form.register("name")}
          />
          <FieldError errors={form.formState.errors.name ? [form.formState.errors.name] : undefined} />
        </FieldContent>
      </Field>

      <div className="space-y-3">
        <p className="text-sm font-medium">Seções fixas</p>
        <ReportTemplateFixedSectionCard section={fixedCanonical[0]} />
        <ReportTemplateFixedSectionCard section={fixedCanonical[1]} />
      </div>

      <ReportTemplateMiddleSectionsEditor
        sections={middleSections}
        onChange={setMiddleSections}
      />

      <div className="flex gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Salvando…" : props.mode === "create" ? "Criar template" : "Salvar alterações"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/report-templates")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
