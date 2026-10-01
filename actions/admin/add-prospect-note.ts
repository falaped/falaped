"use server"

import { z } from "zod"

import { requireAdminAction } from "@/actions/admin/require-admin"
import { addProspectNote } from "@/modules/admin/add-prospect-note"

const noteSchema = z.string().trim().min(1, "Escreva a nota.").max(4000)

/** Nota na linha do tempo de uma pessoa do funil. */
export async function addProspectNoteAction(id: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const parsed = noteSchema.safeParse(text)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nota inválida." }
  try {
    await addProspectNote(gate.admin, id, parsed.data)
    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao salvar a nota." }
  }
}
