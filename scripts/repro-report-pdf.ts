/**
 * Dev repro script for CONS-04 (report PDF print-spacing fix).
 *
 * Renders three synthetic report PDFs at controlled body lengths so the three
 * CONS-04 success-criterion cases can be visually inspected on disk:
 *   - ~0.9 page   (single page; verifies no trailing dead-space band)
 *   - ~1.05 page  (the boundary that triggers the kit's early addPage / phantom page)
 *   - ~2.3 pages  (multi-page; verifies clean flow across page breaks)
 *
 * Synthetic placeholder data ONLY — no real patient rows, no DB access (T-01-07).
 * Output is written under ./tmp (gitignored).
 *
 * Run:  yarn tsx scripts/repro-report-pdf.ts
 *
 * Rerun this AFTER the Path A kit release + version bump (Task 4) to confirm the
 * ~1.05 boundary case no longer produces a phantom page or trailing footer band.
 */

import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { buildReportPdf } from "@falaped/falaped-kit/pdf"

/**
 * Same Path B sanitization the action applies before calling buildReportPdf:
 * collapse runs of 3+ newlines, trim, and drop empty/whitespace-only sections.
 * Keeping this in sync with actions/cases/download-case-report-pdf.ts means the
 * script verifies the exact sanitized payload the app sends to the kit.
 */
function sanitizeSections(
  sections: { title: string; content: string }[],
): { title: string; content: string }[] {
  return sections
    .map((s) => ({
      title: s.title,
      content: (s.content ?? "").replace(/\n{3,}/g, "\n\n").trim(),
    }))
    .filter((s) => s.content.length > 0)
}

const LOREM =
  "Paciente em bom estado geral, hidratado, corado, afebril ao exame. " +
  "Ausculta cardíaca com ritmo regular em dois tempos, sem sopros. " +
  "Ausculta pulmonar com murmúrio vesicular fisiológico, sem ruídos adventícios. " +
  "Abdome flácido, indolor à palpação, sem visceromegalias. " +
  "Orientada a manutenção do aleitamento e retorno conforme calendário."

/** Build a body paragraph block sized roughly by paragraph count. */
function body(paragraphs: number): string {
  return Array.from({ length: paragraphs }, () => LOREM).join("\n\n")
}

/**
 * Build a synthetic datapdf payload matching the shape passed by
 * actions/cases/download-case-report-pdf.ts → buildReportPdf.
 */
function makeDatapdf(sections: { title: string; content: string }[]) {
  return {
    patientName: "Paciente Sintético",
    date: "28/06/2026",
    sections: sanitizeSections(sections),
    doctorName: "Dra. Exemplo",
    doctorCrm: "CRM/SP 000000",
    consultationDateFormatted: "28 de junho de 2026",
    consultationLocation: "São Paulo, SP",
    logoFooter: undefined as string | undefined,
  }
}

// Paragraph counts calibrated to land around the three target page fractions for
// the kit's ABNT report layout (A4, body 12pt). These are intentionally a touch
// generous so the boundary case crosses the kit's contentLimit/footer reserve.
const CASES: { label: string; file: string; sections: { title: string; content: string }[] }[] = [
  {
    label: "~0.9 page (single, no trailing band)",
    file: "repro-0.9.pdf",
    sections: [
      { title: "Anamnese", content: body(3) },
      { title: "Conduta", content: body(2) },
    ],
  },
  {
    label: "~1.05 page (boundary — triggers early addPage)",
    file: "repro-1.05.pdf",
    sections: [
      { title: "Anamnese", content: body(4) },
      { title: "Exame Físico", content: body(3) },
      { title: "Conduta", content: body(2) },
    ],
  },
  {
    label: "~2.3 pages (multi-page flow)",
    file: "repro-2.3.pdf",
    sections: [
      { title: "Anamnese", content: body(6) },
      { title: "Exame Físico", content: body(6) },
      { title: "Hipótese Diagnóstica", content: body(5) },
      { title: "Conduta", content: body(5) },
    ],
  },
]

async function main(): Promise<void> {
  const outDir = path.resolve(process.cwd(), "tmp")
  await mkdir(outDir, { recursive: true })

  for (const c of CASES) {
    const buffer = await buildReportPdf(makeDatapdf(c.sections))
    const outPath = path.join(outDir, c.file)
    await writeFile(outPath, buffer)
    console.log(`[repro] ${c.label} -> ${outPath}`)
  }

  console.log("[repro] done — open the PDFs above to verify CONS-04 visually.")
}

main().catch((err) => {
  console.error("[repro] failed", err)
  process.exit(1)
})
