import type { ScaleDefinition } from "./types"

/**
 * Wong-Baker FACES — dor AUTORRELATADA pela criança que já consegue apontar a
 * carinha correspondente. Item único, escore de 0 a 10 em passos de 2.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const WONG_BAKER: ScaleDefinition = {
  key: "wong-baker",
  name: "Wong-Baker FACES — dor relatada",
  category: "pronto_atendimento",
  summary:
    "Dor relatada pela própria criança apontando a carinha. Item único, escore de 0 a 10.",
  minAgeMonths: 36,
  maxAgeMonths: null,
  items: [
    {
      key: "face",
      label: "Carinha apontada pela criança",
      options: [
        { value: 0, label: "0 — Sem dor" },
        { value: 2, label: "2 — Dói um pouquinho" },
        { value: 4, label: "4 — Dói um pouco mais" },
        { value: 6, label: "6 — Dói ainda mais" },
        { value: 8, label: "8 — Dói muito" },
        { value: 10, label: "10 — Dói o máximo" },
      ],
    },
  ],
  bands: [
    { min: 0, max: 0, label: "Sem dor" },
    {
      min: 1,
      max: 4,
      label: "Dor leve",
      conduct: "Medidas de conforto; analgesia simples se persistir.",
    },
    {
      min: 5,
      max: 6,
      label: "Dor moderada",
      conduct: "Analgesia e reavaliação após a intervenção.",
    },
    {
      min: 7,
      max: 10,
      label: "Dor intensa",
      conduct: "Analgesia imediata e reavaliação frequente.",
    },
  ],
  source: "Wong-Baker FACES Pain Rating Scale. Conteúdo a revisar com o médico.",
}
