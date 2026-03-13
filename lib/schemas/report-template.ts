import { z } from "zod"

const reportTemplateSectionSchema = z.object({
  name: z.string().min(1, "Nome da seção é obrigatório").max(200, "Use no máximo 200 caracteres"),
  description: z.string().max(2000, "Use no máximo 2000 caracteres").optional(),
})

export const createReportTemplateSchema = z.object({
  name: z.string().min(1, "Nome do template é obrigatório").max(200, "Use no máximo 200 caracteres"),
  sections: z
    .array(reportTemplateSectionSchema)
    .min(1, "Adicione pelo menos uma seção"),
})

export const updateReportTemplateSchema = z.object({
  name: z.string().min(1, "Nome do template é obrigatório").max(200, "Use no máximo 200 caracteres").optional(),
  sections: z.array(reportTemplateSectionSchema).min(1, "Adicione pelo menos uma seção").optional(),
})

export type CreateReportTemplateFormData = z.infer<typeof createReportTemplateSchema>
export type UpdateReportTemplateFormData = z.infer<typeof updateReportTemplateSchema>
