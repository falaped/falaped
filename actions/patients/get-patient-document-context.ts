"use server"

import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { getMeasurementsByPatient } from "@/modules/patient-growth/get-measurements-by-patient"

export type PatientDocumentContext = {
  patient: { id: string; name: string; birth_date: string | null; responsible: string | null }
  allergies: string[]
  /** Último peso registrado; null sem medida. */
  lastWeight: { grams: number; measuredOn: string } | null
}

export type GetPatientDocumentContextResult = ({ ok: true } & PatientDocumentContext) | { ok: false; error: string }

/** O que os painéis de documento precisam da criança quando emitidos fora da consulta. */
export async function getPatientDocumentContextAction(patientId: string): Promise<GetPatientDocumentContextResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
  if (!z.uuid().safeParse(patientId).success) return { ok: false, error: "Paciente inválido." }

  try {
    const [patient, measurements] = await Promise.all([
      getPatientById(supabase, patientId, profile.id),
      getMeasurementsByPatient(supabase, profile.id, patientId),
    ])
    if (!patient) return { ok: false, error: "Paciente não encontrado." }
    const weight = measurements.findLast((m) => m.weight_grams !== null)
    return {
      ok: true,
      patient: { id: patient.id, name: patient.name, birth_date: patient.birth_date, responsible: patient.responsible },
      allergies: (patient.allergies ?? "")
        .split(/[\n;,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
      lastWeight: weight ? { grams: weight.weight_grams!, measuredOn: weight.measured_on } : null,
    }
  } catch {
    return { ok: false, error: "Não foi possível carregar a criança. Tente de novo." }
  }
}
