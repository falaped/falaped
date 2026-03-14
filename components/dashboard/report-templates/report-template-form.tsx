"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { ReportTemplateSectionsEditor, type ReportTemplateSectionInput } from "./report-template-sections-editor"
import { createReportTemplateSchema, type CreateReportTemplateFormData } from "@/lib/schemas/report-template"
import { createReportTemplateAction, updateReportTemplateAction } from "@/actions"
import type { ReportTemplateSection } from "@/modules/report-templates/get-report-template-by-id"

type ReportTemplateFormProps = {
  mode: "create"
  initialName?: string
  initialSections?: ReportTemplateSectionInput[]
} | {
  mode: "edit"
  templateId: string
  initialName: string
  initialSections: ReportTemplateSectionInput[]
}

function toSectionInput(s: ReportTemplateSection): ReportTemplateSectionInput {
  return {
    name: s.name ?? "",
    description: s.description ?? "",
  }
}

export function ReportTemplateForm(props: ReportTemplateFormProps) {
  const router = useRouter()
  const initialSections: ReportTemplateSectionInput[] =
    props.mode === "create"
      ? props.initialSections ?? [{ name: "", description: "" }]
      : props.initialSections

  const [sections, setSections] = useState<ReportTemplateSectionInput[]>(initialSections)

  const initialName =
    props.mode === "edit" ? props.initialName : (props.mode === "create" ? props.initialName ?? "" : "")

  const form = useForm<CreateReportTemplateFormData>({
    resolver: zodResolver(createReportTemplateSchema),
    defaultValues: {
      name: initialName,
      sections: initialSections.map(toSectionInput),
    },
  })

  async function onSubmit(data: CreateReportTemplateFormData) {
    const payload = {
      name: data.name,
      sections: sections.map((s) => ({
        name: s.name,
        description: s.description || undefined,
      })),
    }

    if (props.mode === "create") {
      const result = await createReportTemplateAction(payload)
      if (result.ok) {
        toast.success("Template criado.")
        router.push("/dashboard/report-templates")
        router.refresh()
        return
      }
      toast.error(result.error)
      return
    }

    const result = await updateReportTemplateAction(props.templateId, payload)
    if (result.ok) {
      toast.success("Template atualizado.")
      router.push("/dashboard/report-templates")
      router.refresh()
      return
    }
    toast.error(result.error)
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

      <ReportTemplateSectionsEditor
        sections={sections}
        onChange={(next) => {
          setSections(next)
          form.setValue("sections", next, { shouldValidate: true })
        }}
      />
      {form.formState.errors.sections && (
        <p className="text-sm text-destructive" role="alert">
          {form.formState.errors.sections.message}
        </p>
      )}

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
