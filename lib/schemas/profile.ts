import { z } from "zod"

/** Form values: all string (empty string when not set). */
const updateProfileFormSchema = z.object({
  first_name: z
    .string()
    .max(32, "Use no máximo 32 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  surname: z
    .string()
    .max(32, "Use no máximo 32 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  email: z
    .string()
    .transform((v) => (v.trim() === "" ? undefined : v.trim()))
    .pipe(z.string().email("E-mail inválido").optional()),
  crm: z
    .string()
    .max(20, "Use no máximo 20 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  rqe: z
    .string()
    .max(20, "Use no máximo 20 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  social_media_handle: z
    .string()
    .max(100, "Use no máximo 100 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  website: z
    .string()
    .max(500, "Use no máximo 500 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  report_template_id: z.preprocess(
    (v) => (v === undefined || v === null ? "" : v),
    z
      .string()
      .transform((v) => (v.trim() === "" ? undefined : v.trim()))
      .pipe(z.string().uuid("Selecione um template válido").optional())
  ),
  default_location_state: z
    .string()
    .max(100, "Use no máximo 100 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  default_location_city: z
    .string()
    .max(100, "Use no máximo 100 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
})

export const updateProfileSchema = updateProfileFormSchema

/** Form field values (strings; empty string when not set). */
export type UpdateProfileFormValues = z.input<typeof updateProfileSchema>

/** Parsed payload for update (after transform). */
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>
