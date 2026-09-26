"use server"

import { randomUUID } from "node:crypto"
import { format } from "date-fns"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/formatters"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { getExamReadingById } from "@/modules/exam-readings/get-exam-reading-by-id"
import { deleteExamReading } from "@/modules/exam-readings/delete-exam-reading"
import { moveExamReadingPageToAttachment } from "@/modules/exam-readings/move-exam-reading-page-to-attachment"
import { renderMedicalReportPdfForProfile } from "@/modules/medical-reports/render-medical-report-pdf-for-profile"
import { createAttachment } from "@/modules/patient-attachments/create-attachment"
import { uploadAttachmentFile } from "@/modules/patient-attachments/upload-attachment-file"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type ArchiveExamReadingResult = { ok: true } | { ok: false; error: string }

const REPORT_TEXT_MAX_CHARS = 20_000

/** Frase fixa no PDF: registro do apoio de IA (Res. CFM 2.454/2026, art. 4º V). */
const AI_DISCLOSURE =
  "Relatório elaborado com apoio de inteligência artificial a partir do exame anexado e revisado pelo médico responsável."

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("")
}

/**
 * Fecha a leitura: gera o PDF do relatório revisado e o guarda nos ANEXOS do
 * paciente (vinculado ao caso), move as páginas do exame para os anexos
 * também (o exame original é registro clínico e não pode sumir) e apaga a
 * leitura. A seção "Leitura de exames" fica limpa; tudo passa a viver em
 * "Anexos".
 *
 * Ordem importa: PDF primeiro, páginas depois, linha por último. Se algo falha
 * no meio, o que já foi para os anexos fica lá (visível e apagável pelo
 * médico) e a leitura continua na tela para tentar de novo.
 */
export async function archiveExamReadingAction(params: {
  readingId: string
  reportText: string
}): Promise<ArchiveExamReadingResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const reportText = String(params.reportText ?? "").trim()
  if (reportText === "") return { ok: false, error: "O relatório está vazio." }
  if (reportText.length > REPORT_TEXT_MAX_CHARS)
    return { ok: false, error: "Relatório longo demais." }

  try {
    const reading = await getExamReadingById(supabase, profile.id, params.readingId)
    if (!reading) return { ok: false, error: "Leitura não encontrada." }
    const patient = await getPatientById(supabase, reading.patient_id, profile.id)
    if (!patient) return { ok: false, error: "Paciente não encontrado." }

    const today = format(new Date(), "yyyy-MM-dd")
    const pdf = await renderMedicalReportPdfForProfile(
      profile,
      {
        patientName: patient.name,
        birthDate: patient.birth_date ? formatDate(patient.birth_date) : undefined,
        title: "Relatório de exames",
        bodyHtml: textToHtml(`${reading.title}\n\n${reportText}\n\n${AI_DISCLOSURE}`),
      },
      today,
    )

    const pdfId = randomUUID()
    const pdfFile = new File([new Uint8Array(pdf)], `relatorio-exames-${today}.pdf`, {
      type: "application/pdf",
    })
    const pdfPath = await uploadAttachmentFile(
      supabase,
      profile.id,
      patient.id,
      pdfId,
      pdfFile,
    )
    await createAttachment(supabase, profile.id, pdfId, {
      patient_id: patient.id,
      case_id: reading.case_id,
      storage_path: pdfPath,
      file_name: pdfFile.name,
      title: `Relatório de exames — ${reading.title}`,
      mime_type: "application/pdf",
      size_bytes: pdfFile.size,
    })

    const total = reading.page_paths.length
    for (const [i, pagePath] of reading.page_paths.entries()) {
      const attachmentId = randomUUID()
      const path = await moveExamReadingPageToAttachment(
        supabase,
        profile.id,
        patient.id,
        attachmentId,
        pagePath,
      )
      await createAttachment(supabase, profile.id, attachmentId, {
        patient_id: patient.id,
        case_id: reading.case_id,
        storage_path: path,
        file_name: `${i + 1}.jpg`,
        title: total === 1 ? reading.title : `${reading.title} — página ${i + 1} de ${total}`,
        mime_type: "image/jpeg",
        // Tamanho não é lido no move; 0 aparece como "0 B" na lista, e isso é
        // melhor que um HEAD extra por página só para o rótulo.
        size_bytes: 0,
      })
    }

    // Páginas já movidas: só a linha sai.
    await deleteExamReading(supabase, profile.id, reading.id, [])

    revalidatePath(`/dashboard/patients/${patient.id}`)
    if (reading.case_id) revalidatePath(`/dashboard/cases/${reading.case_id}`)
    return { ok: true }
  } catch (e) {
    console.error("[EXAM_READINGS] archive failed", e)
    const message =
      e instanceof Error ? e.message : "Erro ao salvar nos anexos. Tente novamente."
    return { ok: false, error: message }
  }
}
