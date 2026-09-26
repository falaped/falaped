"use server"

import { randomUUID } from "node:crypto"
import { format } from "date-fns"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/formatters"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { getExamReadingById } from "@/modules/exam-readings/get-exam-reading-by-id"
import { deleteExamReading } from "@/modules/exam-readings/delete-exam-reading"
import { downloadExamReadingPages } from "@/modules/exam-readings/download-exam-reading-pages"
import { buildExamPagesPdf } from "@/modules/exam-readings/build-exam-pages-pdf"
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
 * Fecha a leitura: gera o PDF do relatório revisado e junta as páginas do
 * exame num segundo PDF; os dois entram nos ANEXOS do paciente (vinculados ao
 * caso) como um GRUPO (mesmo group_id, papéis "report" e "exam"), que a lista
 * de anexos mostra num card só. Depois a leitura é apagada, páginas soltas
 * incluídas. O exame original é registro clínico: nunca some, só muda de lugar.
 *
 * Os dois PDFs são montados ANTES de qualquer escrita, e as linhas só entram
 * depois dos dois uploads: falha no meio não deixa card pela metade.
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

    const examPdf = await buildExamPagesPdf(
      await downloadExamReadingPages(supabase, reading.page_paths),
    )

    const groupId = reading.id
    const files = [
      {
        id: randomUUID(),
        file: new File([new Uint8Array(pdf)], `relatorio-exames-${today}.pdf`, {
          type: "application/pdf",
        }),
        title: `Relatório de exames — ${reading.title}`,
        role: "report" as const,
      },
      {
        id: randomUUID(),
        file: new File([new Uint8Array(examPdf)], `exame-${today}.pdf`, {
          type: "application/pdf",
        }),
        title: reading.title,
        role: "exam" as const,
      },
    ]

    const paths = await Promise.all(
      files.map((f) => uploadAttachmentFile(supabase, profile.id, patient.id, f.id, f.file)),
    )
    for (const [i, f] of files.entries()) {
      await createAttachment(supabase, profile.id, f.id, {
        patient_id: patient.id,
        case_id: reading.case_id,
        storage_path: paths[i],
        file_name: f.file.name,
        title: f.title,
        mime_type: "application/pdf",
        size_bytes: f.file.size,
        group_id: groupId,
        group_role: f.role,
      })
    }

    await deleteExamReading(supabase, profile.id, reading.id, reading.page_paths)

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
