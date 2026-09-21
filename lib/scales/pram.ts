import type { ScaleDefinition } from "./types"

/**
 * PRAM — gravidade da crise de asma. Cinco itens; escore de 0 a 12.
 *
 * Escolhida no lugar do PASS por incluir a saturação de oxigênio no próprio
 * escore. Ter as duas na lista só atrasa a decisão na hora do atendimento.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const PRAM: ScaleDefinition = {
  key: "pram",
  name: "PRAM — gravidade da crise de asma",
  category: "pronto_atendimento",
  summary: "Gravidade da crise de asma. Cinco itens, escore de 0 a 12.",
  minAgeMonths: 12,
  maxAgeMonths: null,
  items: [
    {
      key: "suprasternal",
      label: "Tiragem supraesternal",
      options: [
        { value: 0, label: "Ausente" },
        { value: 2, label: "Presente" },
      ],
    },
    {
      key: "scalene",
      label: "Contração dos escalenos",
      options: [
        { value: 0, label: "Ausente" },
        { value: 2, label: "Presente" },
      ],
    },
    {
      key: "air_entry",
      label: "Murmúrio vesicular",
      options: [
        { value: 0, label: "Normal" },
        { value: 1, label: "Diminuído nas bases" },
        { value: 2, label: "Diminuído em ápices e bases" },
        { value: 3, label: "Mínimo ou ausente" },
      ],
    },
    {
      key: "wheezing",
      label: "Sibilos",
      options: [
        { value: 0, label: "Ausentes" },
        { value: 1, label: "Expiratórios" },
        { value: 2, label: "Inspiratórios e expiratórios" },
        { value: 3, label: "Audíveis sem estetoscópio ou tórax silencioso" },
      ],
    },
    {
      key: "oxygen_saturation",
      label: "Saturação de oxigênio em ar ambiente",
      options: [
        { value: 0, label: "95% ou mais" },
        { value: 1, label: "92% a 94%" },
        { value: 2, label: "Menor que 92%" },
      ],
    },
  ],
  bands: [
    {
      min: 0,
      max: 3,
      label: "Crise leve",
      conduct: "Broncodilatador e reavaliação; alta provável com orientação.",
    },
    {
      min: 4,
      max: 7,
      label: "Crise moderada",
      conduct: "Broncodilatador seriado e corticoide sistêmico; observar.",
    },
    {
      min: 8,
      max: 12,
      label: "Crise grave",
      conduct: "Tratamento intensivo, oxigênio e internação.",
    },
  ],
  source: "PRAM (Chalut et al., 2000). Conteúdo a revisar com o médico.",
}
