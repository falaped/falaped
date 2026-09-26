"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { env } from "@/lib/env"
import {
  EXAM_READING_MAX_PAGES,
  EXAM_READING_PAGE_MAX_BYTES,
} from "@/lib/constants"
import { findOwnedCaseId } from "@/modules/cases/find-owned-case-id"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { extractExamPages } from "@/modules/groq/extract-exam-pages"
import { splitPageImage } from "@/modules/exam-readings/split-page-image"
import { insertExamReading } from "@/modules/exam-readings/insert-exam-reading"
import { uploadExamReadingPages } from "@/modules/exam-readings/upload-exam-reading-pages"
import { deleteExamReading } from "@/modules/exam-readings/delete-exam-reading"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type CreateExamReadingResult =
  | { ok: true; readingId: string; itemCount: number }
  | { ok: false; error: string }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Cria uma leitura de exame: sobe as páginas (JPEG já preparados no browser),
 * manda ao modelo de visão e grava o resultado. Posse do paciente e do caso é
 * confirmada ANTES de qualquer upload (mesma razão da action de anexos: a RLS
 * ancora em profile_id, não em patients/cases).
 *
 * Se a extração falha, as páginas já enviadas são removidas: não fica leitura
 * pela metade nem arquivo sem linha.
 */
export async function createExamReadingAction(
  formData: FormData,
): Promise<CreateExamReadingResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }
  if (!env.GROQ_API_KEY)
    return { ok: false, error: "Leitura de exames indisponível: IA não configurada." }

  const patientId = String(formData.get("patientId") ?? "")
  const caseId = String(formData.get("caseId") ?? "")
  const rawTitle = formData.get("title")
  const title =
    typeof rawTitle === "string" && rawTitle.trim() !== ""
      ? rawTitle.trim().slice(0, 120)
      : "Exame"
  const pages = formData.getAll("pages").filter((p): p is File => p instanceof File)

  if (!UUID_RE.test(patientId)) return { ok: false, error: "Paciente inválido." }
  if (!UUID_RE.test(caseId)) return { ok: false, error: "Atendimento inválido." }
  if (pages.length === 0) return { ok: false, error: "Envie ao menos uma página." }
  if (pages.length > EXAM_READING_MAX_PAGES)
    return { ok: false, error: `Máximo de ${EXAM_READING_MAX_PAGES} páginas por exame.` }
  if (pages.some((p) => p.size === 0 || p.size > EXAM_READING_PAGE_MAX_BYTES))
    return { ok: false, error: "Uma das páginas está vazia ou grande demais." }

  try {
    const patient = await getPatientById(supabase, patientId, profile.id)
    if (!patient) return { ok: false, error: "Paciente não encontrado." }
    const ownedCaseId = await findOwnedCaseId(supabase, caseId, profile.id)
    if (!ownedCaseId) return { ok: false, error: "Atendimento não encontrado." }

    const readingId = randomUUID()
    const pagePaths = await uploadExamReadingPages(
      supabase,
      profile.id,
      patientId,
      readingId,
      pages,
    )

    let extracted
    try {
      // Cada página vai ao modelo em duas metades: dobra a resolução efetiva.
      const halves = (
        await Promise.all(
          pages.map(async (p) => splitPageImage(Buffer.from(await p.arrayBuffer()))),
        )
      ).flat()
      extracted = await extractExamPages(
        halves.map((h) => ({ mimeType: "image/jpeg", base64: h.toString("base64") })),
        2,
      )
    } catch (e) {
      await deleteExamReading(supabase, profile.id, readingId, pagePaths).catch(() => {})
      throw e
    }

    await insertExamReading(supabase, profile.id, readingId, {
      patient_id: patientId,
      case_id: caseId,
      title,
      page_paths: pagePaths,
      exam_info: extracted.exam,
      items: extracted.items,
      vision_model: env.GROQ_VISION_MODEL,
    })

    revalidatePath(`/dashboard/cases/${caseId}`)
    return { ok: true, readingId, itemCount: extracted.items.length }
  } catch (e) {
    console.error("[EXAM_READINGS] create failed", e)
    const message =
      e instanceof Error ? e.message : "Erro ao ler o exame. Tente novamente."
    return { ok: false, error: message }
  }
}
