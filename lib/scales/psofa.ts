import type { ScaleDefinition, ScaleItem } from "./types"

/**
 * pSOFA — disfunção orgânica na sepse pediátrica. Seis sistemas de 0 a 4;
 * escore de 0 a 24.
 *
 * A pressão arterial média e a creatinina têm corte POR IDADE. Como no Tal, em
 * vez de um item que troca de régua (e erra calado com a ficha sem data de
 * nascimento), é uma escala por faixa etária, cada uma oferecida só na sua.
 * Os outros quatro sistemas são iguais em todas.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
const RESPIRATORY: ScaleItem = {
  key: "respiratory",
  label: "Respiratório — PaO₂/FiO₂ ou SpO₂/FiO₂",
  options: [
    { value: 0, label: "PaO₂/FiO₂ 400 ou mais, ou SpO₂/FiO₂ 292 ou mais" },
    { value: 1, label: "PaO₂/FiO₂ 300 a 399, ou SpO₂/FiO₂ 264 a 291" },
    { value: 2, label: "PaO₂/FiO₂ 200 a 299, ou SpO₂/FiO₂ 221 a 263" },
    { value: 3, label: "PaO₂/FiO₂ 100 a 199, ou SpO₂/FiO₂ 148 a 220, com suporte respiratório" },
    { value: 4, label: "PaO₂/FiO₂ abaixo de 100, ou SpO₂/FiO₂ abaixo de 148, com suporte respiratório" },
  ],
}

const COAGULATION: ScaleItem = {
  key: "coagulation",
  label: "Coagulação — plaquetas (×10³/µL)",
  options: [
    { value: 0, label: "150 ou mais" },
    { value: 1, label: "100 a 149" },
    { value: 2, label: "50 a 99" },
    { value: 3, label: "20 a 49" },
    { value: 4, label: "Abaixo de 20" },
  ],
}

const HEPATIC: ScaleItem = {
  key: "hepatic",
  label: "Hepático — bilirrubina (mg/dL)",
  options: [
    { value: 0, label: "Abaixo de 1,2" },
    { value: 1, label: "1,2 a 1,9" },
    { value: 2, label: "2,0 a 5,9" },
    { value: 3, label: "6,0 a 11,9" },
    { value: 4, label: "12 ou mais" },
  ],
}

const NEUROLOGIC: ScaleItem = {
  key: "neurologic",
  label: "Neurológico — Glasgow",
  options: [
    { value: 0, label: "15" },
    { value: 1, label: "13 a 14" },
    { value: 2, label: "10 a 12" },
    { value: 3, label: "6 a 9" },
    { value: 4, label: "Abaixo de 6" },
  ],
}

function cardiovascular(mapThreshold: number): ScaleItem {
  return {
    key: "cardiovascular",
    label: "Cardiovascular — PAM (mmHg) ou droga vasoativa (µg/kg/min)",
    options: [
      { value: 0, label: `PAM ${mapThreshold} ou mais, sem droga vasoativa` },
      { value: 1, label: `PAM abaixo de ${mapThreshold}, sem droga vasoativa` },
      { value: 2, label: "Dopamina até 5 ou dobutamina em qualquer dose" },
      { value: 3, label: "Dopamina acima de 5, ou adrenalina ou noradrenalina até 0,1" },
      { value: 4, label: "Dopamina acima de 15, ou adrenalina ou noradrenalina acima de 0,1" },
    ],
  }
}

/** Creatinina em mg/dL: os cinco degraus, do normal ao pior. */
function renal(steps: readonly [string, string, string, string, string]): ScaleItem {
  return {
    key: "renal",
    label: "Renal — creatinina (mg/dL)",
    options: steps.map((label, value) => ({ value, label })),
  }
}

function psofa(
  key: string,
  ageLabel: string,
  minAgeMonths: number,
  maxAgeMonths: number,
  mapThreshold: number,
  creatinine: readonly [string, string, string, string, string],
): ScaleDefinition {
  return {
    key,
    name: `pSOFA — ${ageLabel}`,
    category: "enfermaria_uti",
    summary: `Disfunção orgânica na sepse, ${ageLabel}. Seis sistemas, escore de 0 a 24.`,
    minAgeMonths,
    maxAgeMonths,
    items: [
      RESPIRATORY,
      COAGULATION,
      HEPATIC,
      cardiovascular(mapThreshold),
      NEUROLOGIC,
      renal(creatinine),
    ],
    bands: [
      {
        min: 0,
        max: 1,
        label: "Sem disfunção orgânica relevante",
        conduct: "Reavaliar se o quadro mudar.",
      },
      {
        min: 2,
        max: 24,
        label: "Disfunção orgânica",
        conduct:
          "Com infecção suspeita, 2 pontos ou mais acima do basal da criança caracterizam sepse.",
      },
    ],
    source: "pSOFA (Matics e Sanchez-Pinto, 2017). Conteúdo a revisar com o médico.",
  }
}

export const PSOFA_SCALES: readonly ScaleDefinition[] = [
  psofa("psofa-menor-1m", "menor de 1 mês", 0, 0, 46, [
    "Abaixo de 0,8", "0,8 a 0,9", "1,0 a 1,1", "1,2 a 1,5", "1,6 ou mais",
  ]),
  psofa("psofa-1-11m", "1 a 11 meses", 1, 11, 55, [
    "Abaixo de 0,3", "0,3 a 0,4", "0,5 a 0,7", "0,8 a 1,1", "1,2 ou mais",
  ]),
  psofa("psofa-12-23m", "12 a 23 meses", 12, 23, 60, [
    "Abaixo de 0,4", "0,4 a 0,5", "0,6 a 1,0", "1,1 a 1,4", "1,5 ou mais",
  ]),
  psofa("psofa-2-4a", "2 a 4 anos", 24, 59, 62, [
    "Abaixo de 0,6", "0,6 a 0,8", "0,9 a 1,5", "1,6 a 2,2", "2,3 ou mais",
  ]),
  psofa("psofa-5-11a", "5 a 11 anos", 60, 143, 65, [
    "Abaixo de 0,7", "0,7 a 1,0", "1,1 a 1,7", "1,8 a 2,5", "2,6 ou mais",
  ]),
  psofa("psofa-12-18a", "12 a 18 anos", 144, 216, 67, [
    "Abaixo de 1,0", "1,0 a 1,6", "1,7 a 2,8", "2,9 a 4,1", "4,2 ou mais",
  ]),
]
