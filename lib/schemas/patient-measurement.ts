import { z } from "zod"

import {
  isCompleteBirthDateInputString,
  parseBirthDateFormValueToIso,
} from "@/lib/brazilian-date-form"

/**
 * Optional anthropometric value (kg or cm) collected from the form. Accepts a
 * string (from the form) OR a number (from the second parse pass in the action).
 * Empty -> undefined (never required at the field level; the cross-field refine
 * enforces "at least one"). Otherwise coerced and range-checked, output as
 * `number | undefined`. `min`/`max` are inclusive; `message` is the PT-BR error.
 */
function optionalAnthropometric(min: number, max: number, message: string) {
  return z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined
      const s = typeof v === "number" ? String(v) : v
      return s.trim() === "" ? undefined : s.trim().replace(",", ".")
    })
    .refine(
      (v) => {
        if (v === undefined) return true
        const n = Number(v)
        return Number.isFinite(n) && n >= min && n <= max
      },
      message,
    )
    .transform((v) => (v === undefined ? undefined : Number(v)))
}

/**
 * `measured_on`: form sends dd/mm/aaaa; after the client resolver it may also be
 * yyyy-mm-dd. Output is yyyy-mm-dd for Supabase `date`. Rejects future dates by
 * comparing the parsed ISO date against today at local midnight (never `new
 * Date(iso)` raw — that parses as UTC and drifts across timezones, Pitfall 4).
 * Past dates are accepted (retroactive measurements, D-10).
 */
const measuredOnField = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => isCompleteBirthDateInputString(v), {
    message: "Informe a data completa (dd/mm/aaaa).",
  })
  .refine((v) => parseBirthDateFormValueToIso(v) !== null, {
    message: "Use uma data válida no formato dd/mm/aaaa.",
  })
  .transform((v) => parseBirthDateFormValueToIso(v)!)
  .refine(
    (iso) => {
      const [y, m, d] = iso.split("-").map(Number)
      const measured = new Date(y, m - 1, d)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return measured.getTime() <= today.getTime()
    },
    { message: "Data não pode ser futura." },
  )

export const createMeasurementSchema = z
  .object({
    patientId: z.string().uuid(),
    measured_on: measuredOnField,
    weight: optionalAnthropometric(0.3, 180, "Peso deve estar entre 0,3 e 180 kg."),
    length_height: optionalAnthropometric(
      20,
      220,
      "Estatura deve estar entre 20 e 220 cm.",
    ),
    head_circumference: optionalAnthropometric(
      20,
      70,
      "Perímetro cefálico deve estar entre 20 e 70 cm.",
    ),
  })
  .refine(
    (data) =>
      data.weight !== undefined ||
      data.length_height !== undefined ||
      data.head_circumference !== undefined,
    {
      message: "Informe pelo menos uma medida (peso, estatura ou PC).",
      path: ["weight"],
    },
  )

/** Values after Zod parse (measured_on as yyyy-mm-dd; measures as numbers). */
export type CreateMeasurementFormData = z.output<typeof createMeasurementSchema>

/** Raw form state (measured_on as dd/mm/aaaa string; measures as strings). */
export type CreateMeasurementFormInput = z.input<typeof createMeasurementSchema>
