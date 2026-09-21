import {
  BP_REFERENCE_MAX_AGE_YEARS,
  BP_REFERENCE_MIN_AGE_YEARS,
  findBpHeightColumn,
  getBpReferenceRow,
} from "@/lib/bp-reference"
import type { PatientSex } from "@/modules/patients/patient-sex"

/**
 * Classificação de pressão arterial pediátrica pelo guideline AAP 2017.
 *
 * Duas réguas diferentes, por desenho do guideline:
 * - **1 a 12 anos**: percentis por idade, sexo e estatura, com um teto absoluto
 *   ("o que for MENOR" entre o percentil e 120/80, 130/80, 140/90).
 * - **13 anos ou mais**: cortes fixos, iguais aos do adulto. A tabela de
 *   percentis não entra.
 *
 * Abaixo de 1 ano o guideline não traz percentis — devolve `sem_referencia` em
 * vez de inventar faixa.
 */
export type BpCategory =
  | "normal"
  | "elevada"
  | "hipertensao_estagio_1"
  | "hipertensao_estagio_2"
  | "sem_referencia"

export type BpClassification = {
  category: BpCategory
  label: string
  /** Por que caiu nessa faixa, para a tela não mostrar um rótulo sem lastro. */
  detail: string
  /** Qual régua foi usada: percentis da tabela ou cortes fixos do adolescente. */
  basis: "percentil" | "corte_fixo" | "nenhuma"
}

export type BpInput = {
  ageYears: number
  sex: PatientSex
  /** Estatura em cm; escolhe a coluna da tabela. Sem ela não há percentil. */
  heightCm: number | null
  systolic: number
  diastolic: number
}

export const BP_CATEGORY_LABELS: Record<BpCategory, string> = {
  normal: "PA normal",
  elevada: "PA elevada",
  hipertensao_estagio_1: "Hipertensão estágio 1",
  hipertensao_estagio_2: "Hipertensão estágio 2",
  sem_referencia: "Sem referência para a idade",
}

function build(category: BpCategory, detail: string, basis: BpClassification["basis"]): BpClassification {
  return { category, label: BP_CATEGORY_LABELS[category], detail, basis }
}

/** Pior das duas categorias — basta um dos componentes para subir de faixa. */
const ORDER: BpCategory[] = [
  "normal",
  "elevada",
  "hipertensao_estagio_1",
  "hipertensao_estagio_2",
]

function worst(a: BpCategory, b: BpCategory): BpCategory {
  return ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b
}

function categorize(
  value: number,
  elevatedAt: number,
  stage1At: number,
  stage2At: number,
): BpCategory {
  if (value >= stage2At) return "hipertensao_estagio_2"
  if (value >= stage1At) return "hipertensao_estagio_1"
  if (value >= elevatedAt) return "elevada"
  return "normal"
}

export function classifyBloodPressure(input: BpInput): BpClassification {
  const { ageYears, sex, heightCm, systolic, diastolic } = input

  if (ageYears >= 13) {
    // Adolescente: corte fixo. PAS e PAD entram separadas e vale a pior.
    const category = worst(
      categorize(systolic, 120, 130, 140),
      categorize(diastolic, 80, 80, 90),
    )
    return build(
      category,
      `${systolic}/${diastolic} mmHg pelos cortes fixos do adolescente (120/80, 130/80 e 140/90).`,
      "corte_fixo",
    )
  }

  if (ageYears < BP_REFERENCE_MIN_AGE_YEARS || ageYears > BP_REFERENCE_MAX_AGE_YEARS) {
    return build(
      "sem_referencia",
      "O guideline não traz percentis de pressão arterial para esta idade.",
      "nenhuma",
    )
  }

  if (heightCm === null) {
    return build(
      "sem_referencia",
      "Falta a estatura: o percentil de PA depende de idade, sexo e estatura.",
      "nenhuma",
    )
  }

  const row = getBpReferenceRow(sex, ageYears)
  if (!row) {
    return build(
      "sem_referencia",
      "O guideline não traz percentis de pressão arterial para esta idade.",
      "nenhuma",
    )
  }

  const column = findBpHeightColumn(row, heightCm)

  // "O que for menor" entre o percentil e o corte absoluto — é assim que o
  // guideline define cada faixa de 1 a 12 anos.
  const sbpCategory = categorize(
    systolic,
    Math.min(row.sbp90[column], 120),
    Math.min(row.sbp95[column], 130),
    Math.min(row.sbp95[column] + 12, 140),
  )
  const dbpCategory = categorize(
    diastolic,
    Math.min(row.dbp90[column], 80),
    Math.min(row.dbp95[column], 80),
    Math.min(row.dbp95[column] + 12, 90),
  )

  return build(
    worst(sbpCategory, dbpCategory),
    `${systolic}/${diastolic} mmHg para ${ageYears} ano${ageYears === 1 ? "" : "s"} e ${heightCm} cm: percentil 95 em ${row.sbp95[column]}/${row.dbp95[column]} mmHg.`,
    "percentil",
  )
}
