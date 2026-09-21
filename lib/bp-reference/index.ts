import type { PatientSex } from "@/modules/patients/patient-sex"

import boys from "./aap-2017/boys.json"
import girls from "./aap-2017/girls.json"

/**
 * Uma linha da tabela de referência: uma idade, com os sete valores de cada
 * percentil — um por coluna de percentil de estatura (5, 10, 25, 50, 75, 90, 95).
 *
 * O percentil 95 + 12 mmHg, que separa o estágio 1 do estágio 2, NÃO está no
 * arquivo: é `p95 + 12` por definição do próprio guideline, e a igualdade foi
 * conferida célula a célula contra o PDF na extração.
 */
export type BpReferenceRow = {
  ageYears: number
  /** Estatura em cm de cada coluna, na ordem dos percentis de estatura. */
  heightCm: number[]
  sbp50: number[]
  sbp90: number[]
  sbp95: number[]
  dbp50: number[]
  dbp90: number[]
  dbp95: number[]
}

/** Percentis de estatura que rotulam as colunas da tabela. */
export const BP_HEIGHT_PERCENTILES = [5, 10, 25, 50, 75, 90, 95] as const

/**
 * Procedência, para aparecer na tela junto do resultado: classificação de PA em
 * criança sem a fonte à vista é número solto.
 */
export const BP_REFERENCE_SOURCE =
  "AAP 2017 — Clinical Practice Guideline for Screening and Management of High Blood Pressure in Children and Adolescents (Pediatrics 140(3):e20171904), Tabelas 4 e 5."

/** Faixa etária coberta pela tabela: abaixo de 1 ano o guideline não traz percentis. */
export const BP_REFERENCE_MIN_AGE_YEARS = 1
export const BP_REFERENCE_MAX_AGE_YEARS = 17

const TABLES: Record<PatientSex, BpReferenceRow[]> = {
  masculino: boys as BpReferenceRow[],
  feminino: girls as BpReferenceRow[],
}

/** Linha da idade em anos inteiros, ou null fora da faixa coberta pela tabela. */
export function getBpReferenceRow(
  sex: PatientSex,
  ageYears: number,
): BpReferenceRow | null {
  return TABLES[sex].find((row) => row.ageYears === ageYears) ?? null
}

/**
 * Índice da coluna de estatura a usar. A tabela impressa traz a estatura em cm
 * de cada coluna justamente para ser lida assim — pega-se a coluna da estatura
 * mais próxima da criança.
 *
 * ponytail: arredonda para a coluna mais próxima em vez de interpolar entre
 * duas; a diferença entre colunas vizinhas é de 1 a 2 mmHg. Interpolar só vale
 * a pena se o médico reclamar de caso de fronteira.
 */
export function findBpHeightColumn(row: BpReferenceRow, heightCm: number): number {
  let best = 0
  for (let i = 1; i < row.heightCm.length; i++) {
    if (
      Math.abs(row.heightCm[i] - heightCm) <
      Math.abs(row.heightCm[best] - heightCm)
    ) {
      best = i
    }
  }
  return best
}
