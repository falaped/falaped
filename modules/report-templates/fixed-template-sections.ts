import type {
  ReportTemplateSection,
  ReportTemplateSectionSlot,
} from "./get-report-template-by-id"

/** Legacy-only: sections titled like pediatra are stripped and not re-added. */
const LEGACY_PEDIATRICIAN_SLOT = "pediatrician" as const

/**
 * Canonical definitions for the two fixed template sections (order: identity, clinical).
 */
export function buildFixedTemplateSections(): ReportTemplateSection[] {
  return [
    {
      slot: "patient_identity",
      name: "Paciente",
      description:
        "Preenchido automaticamente com identificação e contato do paciente ao gerar o relatório.",
    },
    {
      slot: "patient_clinical",
      name: "Dados clínicos",
      description:
        "Preenchido automaticamente com dados clínicos cadastrados ao gerar o relatório.",
    },
  ]
}

function stripDiacritics(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

/**
 * Maps legacy titles to a slot. `pediatrician` is returned only to detect sections that must be removed.
 */
export function inferFixedSlotFromLegacySectionTitle(
  name: string,
): ReportTemplateSectionSlot | typeof LEGACY_PEDIATRICIAN_SLOT | null {
  const key = stripDiacritics(name)
  if (key === "dados do paciente") return "patient_identity"
  if (
    key === "dados clinicos do paciente" ||
    key === "dados clínicos do paciente"
  ) {
    return "patient_clinical"
  }
  if (key === "dados do pediatra" || key === "pediatra") {
    return LEGACY_PEDIATRICIAN_SLOT
  }
  return null
}

function isFixedSlot(value: unknown): value is ReportTemplateSectionSlot {
  return value === "patient_identity" || value === "patient_clinical"
}

function isLegacyPediatricianSection(section: ReportTemplateSection): boolean {
  if ((section.slot as string | undefined) === LEGACY_PEDIATRICIAN_SLOT) {
    return true
  }
  return (
    inferFixedSlotFromLegacySectionTitle(section.name) ===
    LEGACY_PEDIATRICIAN_SLOT
  )
}

/**
 * Rebuilds sections as: [identity, clinical, ...free in order...].
 * Strips pediatra sections (legacy). Replaces identity/clinical with canonical definitions.
 */
export function normalizeReportTemplateSections(
  sections: ReportTemplateSection[],
): ReportTemplateSection[] {
  const [identityCanon, clinicalCanon] = buildFixedTemplateSections()
  const free: ReportTemplateSection[] = []

  for (const section of sections) {
    if (isLegacyPediatricianSection(section)) {
      continue
    }

    const fromExplicit = isFixedSlot(section.slot) ? section.slot : null
    const fromLegacy = fromExplicit
      ? null
      : inferFixedSlotFromLegacySectionTitle(section.name)
    const isIdentityOrClinical =
      fromExplicit ??
      (fromLegacy === "patient_identity" || fromLegacy === "patient_clinical"
        ? fromLegacy
        : null)

    if (isIdentityOrClinical) {
      continue
    }

    const nameTrimmed = section.name?.trim() ?? ""
    if (!nameTrimmed) {
      continue
    }

    free.push({
      name: section.name,
      description: section.description,
      information_not_extracted_reason:
        section.information_not_extracted_reason,
    })
  }

  return [identityCanon, clinicalCanon, ...free]
}

/** Sections passed to the LLM when generating a case report (after the two fixed slots). */
export function partitionSectionsForAi(
  sections: ReportTemplateSection[],
): Array<{ name: string; description?: string }> {
  const normalized = normalizeReportTemplateSections(sections)
  return normalized.slice(2).map((s) => ({
    name: s.name,
    description: s.description,
  }))
}

export function splitNormalizedTemplateSectionsForEditor(
  sections: ReportTemplateSection[],
): {
  fixedTop: ReportTemplateSection[]
  middle: ReportTemplateSection[]
} {
  const normalized = normalizeReportTemplateSections(sections)
  const built = buildFixedTemplateSections()
  if (normalized.length < 2) {
    return {
      fixedTop: [built[0], built[1]],
      middle: [],
    }
  }
  return {
    fixedTop: [normalized[0], normalized[1]],
    middle: normalized.slice(2),
  }
}

/** Combines middle (editable) sections with the two fixed slots in the correct order. */
export function mergeEditorTemplateSections(
  middle: ReportTemplateSection[],
): ReportTemplateSection[] {
  const fixed = buildFixedTemplateSections()
  return normalizeReportTemplateSections([fixed[0], fixed[1], ...middle])
}

/** Merges AI-suggested middle sections with fixed slots (for “Gerar com IA”). */
export function mergeAiSuggestedMiddleSections(
  suggestedMiddle: ReportTemplateSection[],
): ReportTemplateSection[] {
  const fixed = buildFixedTemplateSections()
  return normalizeReportTemplateSections([fixed[0], fixed[1], ...suggestedMiddle])
}
