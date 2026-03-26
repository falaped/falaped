import type { ReportTemplateSection } from "@/modules/report-templates/get-report-template-by-id"
import { inferFixedSlotFromLegacySectionTitle } from "@/modules/report-templates/fixed-template-sections"
import type { GenerateReportTemplateSectionsResult } from "@/modules/groq/generate-report-template-sections"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"

export function getFallbackResult(): GenerateReportTemplateSectionsResult {
  return {
    suggestedName: "Template sugerido pela IA",
    sections: [
      { name: "Queixa principal", description: "Motivo da consulta" },
      { name: "História da moléstia atual", description: "Evolução e sintomas" },
      { name: "Exame físico", description: "Achados do exame" },
      { name: "Conduta", description: "Conduta e orientações" },
    ],
  }
}

export function parseJsonResponse(raw: string): { suggestedName?: string; sections?: unknown[] } | null {
  const cleaned = stripJsonFences(raw)
  try {
    const obj = JSON.parse(cleaned)
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      return obj as { suggestedName?: string; sections?: unknown[] }
    }
  } catch {
    // ignore
  }
  return null
}

export function normalizeSections(sections: unknown[]): ReportTemplateSection[] {
  const result: ReportTemplateSection[] = []
  const seen = new Set<string>()
  for (const item of sections) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue
    const name = (item as { name?: unknown }).name
    const description = (item as { description?: unknown }).description
    const nameStr = typeof name === "string" ? name.trim().slice(0, 200) : ""
    if (!nameStr || seen.has(nameStr)) continue
    if (inferFixedSlotFromLegacySectionTitle(nameStr)) continue
    seen.add(nameStr)
    result.push({
      name: nameStr,
      description:
        typeof description === "string" && description.trim()
          ? description.trim().slice(0, 2000)
          : undefined,
    })
  }
  return result
}
