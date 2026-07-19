import { z } from "zod"

/**
 * Input for the toggle applied-dose action (VAC-05). Boolean grain: `taken`
 * decides mark (true) vs unmark (false) for a SPECIFIC reference item on a
 * patient. Ids are validated as UUIDs at the action boundary.
 */
export const togglePatientVaccineDoseSchema = z.object({
  patientId: z.string().uuid("Paciente inválido."),
  scheduleItemId: z.string().uuid("Item de vacina inválido."),
  taken: z.boolean(),
})

export type TogglePatientVaccineDoseInput = z.infer<
  typeof togglePatientVaccineDoseSchema
>
