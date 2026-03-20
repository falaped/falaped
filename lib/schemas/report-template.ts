import { z } from "zod"
import { REPORT_TEMPLATE_SECTION_SLOTS } from "@/modules/report-templates/get-report-template-by-id"

const reportTemplateSectionSlotSchema = z.enum(REPORT_TEMPLATE_SECTION_SLOTS)

const reportTemplateSectionSchema = z.object({
  name: z.string().min(1, "Nome da seção é obrigatório").max(200, "Use no máximo 200 caracteres"),
  description: z.string().max(2000, "Use no máximo 2000 caracteres").optional(),
  information_not_extracted_reason: z.string().max(2000).optional(),
  slot: reportTemplateSectionSlotSchema.optional(),
})

export const createReportTemplateSchema = z.object({
  name: z.string().min(1, "Nome do template é obrigatório").max(200, "Use no máximo 200 caracteres"),
  /** Submitted as two fixed sections + middle; server normalizes order and slots. Middle may be empty. */
  sections: z.array(reportTemplateSectionSchema).min(2, "Template inválido: faltam seções."),
})

export const updateReportTemplateSchema = z.object({
  name: z.string().min(1, "Nome do template é obrigatório").max(200, "Use no máximo 200 caracteres").optional(),
  sections: z.array(reportTemplateSectionSchema).min(2, "Template inválido: faltam seções.").optional(),
})

export type CreateReportTemplateFormData = z.infer<typeof createReportTemplateSchema>
export type UpdateReportTemplateFormData = z.infer<typeof updateReportTemplateSchema>
