import { z } from "zod"

import { BOOK_COUPONS, BOOK_QUALITIES, STORY_PAGE_COUNT } from "@/modules/books/constants"
import { countWords, STORY_FORBIDDEN_CHARS, STORY_HARD_MAX_WORDS, STORY_HARD_MIN_WORDS } from "@/modules/books/story/rules"
import { BOOK_THEMES } from "@/modules/books/themes"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use até ${max} caracteres.`)
    .nullable()
    .optional()
    .transform((v) => v || null)

export const RELATIVE_ROLES = ["vovó", "vovô", "madrinha", "padrinho", "irmão", "irmã"] as const
export type RelativeRole = (typeof RELATIVE_ROLES)[number]

const shortName = z.string().trim().min(1, "Informe o nome.").max(40, "Nome muito longo.")

/** Detalhes opcionais que personalizam a história (entrada do formulário). */
export const bookDetailsSchema = z.object({
  pet: z.object({ kind: z.string().trim().min(1, "Diga o tipo do animal.").max(40), name: shortName }).nullable().optional(),
  relatives: z
    .array(z.object({ role: z.enum(RELATIVE_ROLES), name: shortName, note: optionalText(80) }))
    .max(6, "Até 6 familiares.")
    .optional()
    .default([]),
  favoriteToy: optionalText(60),
  extra: optionalText(300),
})
export type BookDetails = z.infer<typeof bookDetailsSchema>

/** Uma página de história final (sem placeholders). Tokens `{{key}}` na cena viram a descrição do elenco extra. */
export const bookStoryPageSchema = z.object({
  text: z
    .string()
    .trim()
    .refine((t) => countWords(t) >= STORY_HARD_MIN_WORDS, `Escreva pelo menos ${STORY_HARD_MIN_WORDS} palavras.`)
    .refine((t) => countWords(t) <= STORY_HARD_MAX_WORDS, `Use até ${STORY_HARD_MAX_WORDS} palavras.`)
    .refine((t) => !STORY_FORBIDDEN_CHARS.test(t), "Sem travessão nem aspas: o modelo erra ao desenhá-los.")
    .refine((t) => !/[{}]/.test(t), "Sem chaves no texto."),
  scene: z.string().trim().min(10).max(1500),
  panel: z.enum(["upper", "lower"]),
})

export const bookStorySchema = z.object({
  cast: z
    .array(
      z.object({
        key: z.string().regex(/^[a-z][a-z0-9]*$/),
        label: z.string().trim().min(1).max(80),
        /** Nome pelo qual o texto cita o extra; usado para alinhar texto e cena. */
        name: z.string().trim().min(1).max(60).optional(),
        description: z.string().trim().min(3).max(300),
      }),
    )
    .max(10),
  pages: z.array(bookStoryPageSchema).length(STORY_PAGE_COUNT, `A história tem ${STORY_PAGE_COUNT} páginas.`),
})
export type BookStory = z.infer<typeof bookStorySchema>
export type BookStoryPage = z.infer<typeof bookStoryPageSchema>

export const createBookSchema = z.object({
  childName: z.string().trim().min(2, "Informe o nome da criança.").max(40, "Nome muito longo."),
  childGender: z.enum(["menino", "menina"], { message: "Escolha menino ou menina." }),
  theme: z.string().refine((slug) => slug in BOOK_THEMES, "Escolha um tema."),
  quality: z.enum(BOOK_QUALITIES, { message: "Escolha a qualidade." }),
  dedication: optionalText(400),
  pediatricianName: optionalText(80),
  details: bookDetailsSchema.nullable().optional(),
  story: bookStorySchema.nullable().optional(),
})

export type CreateBookInput = z.infer<typeof createBookSchema>

/** Entrada da geração da história (antes de criar o livro). */
export const generateStorySchema = z.object({
  childName: createBookSchema.shape.childName,
  childGender: createBookSchema.shape.childGender,
  theme: createBookSchema.shape.theme,
  pediatricianName: optionalText(80),
  details: bookDetailsSchema,
})
export type GenerateStoryInput = z.infer<typeof generateStorySchema>

/** Entrada do alinhamento das cenas após a revisão: a história editada e o texto anterior das páginas alteradas. */
export const alignStorySchema = z.object({
  story: bookStorySchema,
  changed: z.array(z.object({ position: z.number().int().min(0).max(STORY_PAGE_COUNT - 1), previousText: z.string().max(600) })).max(STORY_PAGE_COUNT),
})
export type AlignStoryInput = z.infer<typeof alignStorySchema>

/** Passo 1 da landing pública: contato do responsável + consentimento LGPD. */
export const bookLeadSchema = z.object({
  firstName: z.string().trim().min(2, "Informe seu nome.").max(60, "Nome muito longo."),
  lastName: z.string().trim().min(2, "Informe seu sobrenome.").max(60, "Sobrenome muito longo."),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Informe um e-mail válido.")),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""))
    .refine((v) => /^[1-9]{2}9?\d{8}$/.test(v), "Informe o WhatsApp com DDD."),
  consent: z.literal(true, { message: "Aceite a política de privacidade para continuar." }),
  coupon: z
    .string()
    .trim()
    .toUpperCase()
    .max(30)
    .optional()
    .default("")
    .transform((v) => v || null)
    .refine((v) => v === null || v in BOOK_COUPONS, "Cupom não encontrado. Confira o código."),
})
export type BookLeadInput = z.infer<typeof bookLeadSchema>

/** Passo 2 da landing pública: criança + dedicatória + tema (a capa é gerada em seguida). */
export const createLeadBookSchema = createBookSchema.pick({ childName: true, childGender: true, theme: true, dedication: true })
