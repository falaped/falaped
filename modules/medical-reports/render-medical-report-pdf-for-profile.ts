import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import type { Profile } from "@/modules/profiles/types"
import { generateMedicalReportPdf } from "@/modules/medical-reports/generate-medical-report-pdf"
import type { DoctorInfo, MedicalReportPayload } from "@/modules/medical-reports/types"

type ProfileForPdf = Pick<
  Profile,
  | "first_name"
  | "surname"
  | "crm"
  | "rqe"
  | "logo_url_full"
  | "default_location_state"
  | "default_location_city"
>

/** "26 de setembro de 2026" a partir de yyyy-MM-dd; data inválida cai para hoje. */
export function formatMedicalReportIssuedAt(issuedAt: string): string {
  const d = new Date(issuedAt + "T12:00:00")
  return format(Number.isNaN(d.getTime()) ? new Date() : d, "d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  })
}

/**
 * Monta o PDF do relatório com cabeçalho/rodapé do médico (nome, CRM, RQE,
 * cidade e logo). É o miolo compartilhado entre o relatório avulso e o
 * relatório de exames; quem chama decide onde o PDF é guardado.
 */
export async function renderMedicalReportPdfForProfile(
  profile: ProfileForPdf,
  payload: MedicalReportPayload,
  issuedAtDate: string,
): Promise<Buffer> {
  const doctor: DoctorInfo = {
    firstName: profile.first_name ?? "",
    surname: profile.surname ?? "",
    crm: profile.crm ?? null,
    rqe: profile.rqe ?? null,
  }
  const locationDisplay =
    profile.default_location_city?.trim() && profile.default_location_state?.trim()
      ? `${profile.default_location_city.trim()} - ${profile.default_location_state.trim()}`
      : (profile.default_location_state?.trim() ?? "—")

  let logoBuffer: Buffer | null = null
  if (profile.logo_url_full?.trim()) {
    try {
      const res = await fetch(profile.logo_url_full.trim())
      if (res.ok) logoBuffer = Buffer.from(await res.arrayBuffer())
    } catch {
      // sem logo em falha de rede
    }
  }

  return generateMedicalReportPdf({
    payload,
    doctor,
    issuedAt: formatMedicalReportIssuedAt(issuedAtDate),
    locationDisplay,
    logoBuffer,
  })
}
