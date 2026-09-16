import { z } from "zod"

import { BOOK_QUALITIES } from "@/modules/books/constants"
import { BOOK_THEMES } from "@/modules/books/themes"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use até ${max} caracteres.`)
    .optional()
    .transform((v) => v || null)

export const createBookSchema = z.object({
  childName: z.string().trim().min(2, "Informe o nome da criança.").max(40, "Nome muito longo."),
  childGender: z.enum(["menino", "menina"], { message: "Escolha menino ou menina." }),
  theme: z.string().refine((slug) => slug in BOOK_THEMES, "Escolha um tema."),
  quality: z.enum(BOOK_QUALITIES, { message: "Escolha a qualidade." }),
  dedication: optionalText(400),
  pediatricianName: optionalText(80),
})

export type CreateBookInput = z.infer<typeof createBookSchema>
