import { z } from "zod"

/** Painel de exames (modelo): nome e pelo menos um exame. */
export const createExamPanelSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao modelo."),
  panelItems: z
    .array(z.string().trim().min(1))
    .min(1, "Adicione pelo menos um exame ao painel."),
})
