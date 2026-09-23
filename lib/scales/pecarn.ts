import type { ScaleDefinition, ScaleItem } from "./types"

/**
 * PECARN — TC de crânio no trauma craniano leve (Glasgow 14 ou 15, até 24 h).
 *
 * É uma árvore de decisão, não um escore: qualquer achado de alto risco indica
 * TC; sem nenhum, qualquer achado intermediário leva a observar ou tomografar;
 * sem nenhum dos dois, a TC não é recomendada. A árvore cabe no motor de soma
 * com pesos: alto risco vale 10, intermediário vale 1 — nenhuma soma de
 * intermediários chega a 10, então a faixa sai igual à da árvore. O número em
 * si não significa nada, por isso `hideScore`.
 *
 * A árvore muda aos 2 anos: duas escalas, como no Tal.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
function finding(key: string, label: string, weight: 1 | 10): ScaleItem {
  return {
    key,
    label,
    options: [
      { value: 0, label: "Não" },
      { value: weight, label: "Sim" },
    ],
  }
}

const GCS = finding("gcs_below_15", "Glasgow abaixo de 15", 10)
const MENTAL_STATUS = finding(
  "altered_mental_status",
  "Outro sinal de alteração do estado mental (agitação, sonolência, perguntas repetitivas, resposta lenta)",
  10,
)

function pecarn(
  key: string,
  ageLabel: string,
  minAgeMonths: number,
  maxAgeMonths: number,
  items: readonly ScaleItem[],
  risks: { high: string; intermediate: string; low: string },
): ScaleDefinition {
  return {
    key,
    name: `PECARN — trauma craniano, ${ageLabel}`,
    category: "pronto_atendimento",
    summary: `Indicação de TC no trauma craniano leve (Glasgow 14–15), ${ageLabel}.`,
    minAgeMonths,
    maxAgeMonths,
    hideScore: true,
    items,
    bands: [
      {
        min: 0,
        max: 0,
        label: "TC não recomendada",
        conduct: `Risco de lesão clinicamente importante ${risks.low}.`,
      },
      {
        min: 1,
        max: 9,
        label: "Observação ou TC",
        conduct: `Risco ${risks.intermediate}. Decidir pela experiência do médico, por achados múltiplos, piora na observação e preferência dos pais.`,
      },
      {
        min: 10,
        max: 34,
        label: "TC recomendada",
        conduct: `Risco de lesão clinicamente importante ${risks.high}.`,
      },
    ],
    source: "Regra do PECARN (Kuppermann et al., 2009). Conteúdo a revisar com o médico.",
  }
}

export const PECARN_UNDER_2Y = pecarn(
  "pecarn-menor-2a",
  "menor de 2 anos",
  0,
  23,
  [
    GCS,
    MENTAL_STATUS,
    finding("palpable_fracture", "Fratura de crânio palpável", 10),
    finding(
      "scalp_hematoma",
      "Hematoma de couro cabeludo occipital, parietal ou temporal",
      1,
    ),
    finding("loss_of_consciousness", "Perda de consciência de 5 s ou mais", 1),
    finding(
      "severe_mechanism",
      "Mecanismo grave (ejeção ou morte em acidente de carro, capotamento, atropelamento, queda de mais de 0,9 m, impacto de objeto de alta energia)",
      1,
    ),
    finding("not_acting_normally", "Não está agindo normalmente, segundo os pais", 1),
  ],
  { high: "de 4,4%", intermediate: "de 0,9%", low: "abaixo de 0,02%" },
)

export const PECARN_2Y_PLUS = pecarn(
  "pecarn-2a-ou-mais",
  "2 anos ou mais",
  24,
  215,
  [
    GCS,
    MENTAL_STATUS,
    finding("basilar_fracture", "Sinais de fratura de base de crânio", 10),
    finding("loss_of_consciousness", "Qualquer perda de consciência", 1),
    finding("vomiting", "Vômitos", 1),
    finding(
      "severe_mechanism",
      "Mecanismo grave (ejeção ou morte em acidente de carro, capotamento, atropelamento, queda de mais de 1,5 m, impacto de objeto de alta energia)",
      1,
    ),
    finding("severe_headache", "Cefaleia intensa", 1),
  ],
  { high: "de 4,3%", intermediate: "de 0,9%", low: "abaixo de 0,05%" },
)

export const PECARN_SCALES: readonly ScaleDefinition[] = [
  PECARN_UNDER_2Y,
  PECARN_2Y_PLUS,
]
