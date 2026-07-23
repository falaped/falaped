import { z } from "zod"

/**
 * Schemas de validação de consultas (APPT-01..04, Fase 7). Validação no boundary
 * (actions) via safeParse; mensagens PT-BR inline alimentam zodErrorToUserMessage.
 *
 * starts_at/ends_at são strings ISO datetime (UTC) — exatamente o que
 * expandAvailability (Fase 6) emite via Date.toISOString(). O .refine garante
 * ends_at > starts_at, espelhando o CHECK constraint do banco.
 */

/** Os 5 valores do ciclo de status, espelhando o pg enum appointment_status. */
export const appointmentStatusSchema = z.enum([
  "pending",
  "confirmed",
  "done",
  "no_show",
  "canceled",
])

export type AppointmentStatusInput = z.infer<typeof appointmentStatusSchema>

/**
 * Criação de consulta (APPT-01): paciente já cadastrado + intervalo do slot livre
 * (D-01/D-02). O profile_id é estampado server-side no action (nunca do cliente).
 */
export const createAppointmentSchema = z
  .object({
    patient_id: z.string().uuid("Paciente inválido."),
    starts_at: z
      .string()
      .datetime({ message: "Horário inicial inválido." }),
    ends_at: z.string().datetime({ message: "Horário final inválido." }),
  })
  .refine((input) => new Date(input.ends_at) > new Date(input.starts_at), {
    message: "O horário final deve ser posterior ao inicial.",
    path: ["ends_at"],
  })

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>

/**
 * Transição de status (APPT-02/APPT-03): confirmar/recusar um pedido, marcar
 * realizada/falta/cancelar. `from` habilita o compare-and-set (.eq("status", from))
 * no UPDATE, evitando sobrescrever uma transição concorrente. A legalidade
 * (from -> to) é checada por isLegalTransition no action.
 */
export const updateAppointmentStatusSchema = z.object({
  id: z.string().uuid("Consulta inválida."),
  from: appointmentStatusSchema,
  to: appointmentStatusSchema,
})

export type UpdateAppointmentStatusInput = z.infer<
  typeof updateAppointmentStatusSchema
>
