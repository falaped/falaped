import type { ScaleDefinition, ScaleItem } from "./types"

/**
 * Escore de Tal — gravidade da bronquiolite e da sibilância do lactente. Quatro
 * itens de 0 a 3; escore de 0 a 12.
 *
 * A frequência respiratória tem faixas DIFERENTES abaixo e a partir dos 6 meses.
 * Em vez de um item que muda de régua conforme a idade (que o motor não faz e
 * que erra calado se o cadastro estiver sem data de nascimento), são duas
 * escalas, cada uma oferecida só na sua faixa etária.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
const SHARED_ITEMS: readonly ScaleItem[] = [
  {
    key: "wheezing",
    label: "Sibilância",
    options: [
      { value: 0, label: "Ausente" },
      { value: 1, label: "Ao fim da expiração, com estetoscópio" },
      { value: 2, label: "Em toda a expiração, com estetoscópio" },
      { value: 3, label: "Inspiratória e expiratória, audível sem estetoscópio" },
    ],
  },
  {
    key: "accessory_muscles",
    label: "Uso de musculatura acessória",
    options: [
      { value: 0, label: "Ausente" },
      { value: 1, label: "Tiragem intercostal" },
      { value: 2, label: "Tiragem intercostal, supraclavicular e batimento de asa de nariz" },
      { value: 3, label: "Os anteriores mais tiragem supraesternal" },
    ],
  },
  {
    key: "cyanosis",
    label: "Cianose",
    options: [
      { value: 0, label: "Ausente" },
      { value: 1, label: "Perioral ao chorar" },
      { value: 2, label: "Perioral em repouso" },
      { value: 3, label: "Generalizada em repouso" },
    ],
  },
]

function talScale(
  key: string,
  ageLabel: string,
  minAgeMonths: number,
  maxAgeMonths: number | null,
  respiratoryRateOptions: readonly string[],
): ScaleDefinition {
  return {
    key,
    name: `Tal — bronquiolite (${ageLabel})`,
    category: "pronto_atendimento",
    summary: `Gravidade da bronquiolite e da sibilância ${ageLabel}. Quatro itens, escore de 0 a 12.`,
    minAgeMonths,
    maxAgeMonths,
    items: [
      {
        key: "respiratory_rate",
        label: "Frequência respiratória",
        options: respiratoryRateOptions.map((label, value) => ({ value, label })),
      },
      ...SHARED_ITEMS,
    ],
    bands: [
      {
        min: 0,
        max: 4,
        label: "Leve",
        conduct: "Manejo ambulatorial com orientação e reavaliação.",
      },
      {
        min: 5,
        max: 8,
        label: "Moderada",
        conduct: "Observação em unidade, oxigênio se necessário e reavaliação seriada.",
      },
      {
        min: 9,
        max: 12,
        label: "Grave",
        conduct: "Suporte respiratório e internação.",
      },
    ],
    source: "Escore de Tal (Tal et al., 1983). Conteúdo a revisar com o médico.",
  }
}

export const TAL_UNDER_6M = talScale("tal-menor-6m", "menor de 6 meses", 0, 5, [
  "40 irpm ou menos",
  "41 a 55 irpm",
  "56 a 70 irpm",
  "Mais de 70 irpm",
])

export const TAL_6M_PLUS = talScale("tal-6m-ou-mais", "6 meses ou mais", 6, 24, [
  "30 irpm ou menos",
  "31 a 45 irpm",
  "46 a 60 irpm",
  "Mais de 60 irpm",
])

export const TAL_SCALES: readonly ScaleDefinition[] = [TAL_UNDER_6M, TAL_6M_PLUS]
