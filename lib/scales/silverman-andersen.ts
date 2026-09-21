import type { ScaleDefinition } from "./types"

/**
 * Boletim de Silverman-Andersen — desconforto respiratório do recém-nascido.
 * Cinco itens de 0 a 2; escore de 0 a 10, e aqui QUANTO MAIOR, PIOR.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const SILVERMAN_ANDERSEN: ScaleDefinition = {
  key: "silverman-andersen",
  name: "Silverman-Andersen — desconforto respiratório neonatal",
  category: "neonatologia",
  summary:
    "Desconforto respiratório do recém-nascido. Cinco sinais, escore de 0 a 10 (quanto maior, pior).",
  minAgeMonths: 0,
  maxAgeMonths: 2,
  items: [
    {
      key: "chest_abdomen",
      label: "Movimento tóraco-abdominal",
      options: [
        { value: 0, label: "Sincronizado" },
        { value: 1, label: "Tórax imóvel, abdome em movimento" },
        { value: 2, label: "Discordância (respiração em balancim)" },
      ],
    },
    {
      key: "intercostal",
      label: "Retração intercostal",
      options: [
        { value: 0, label: "Ausente" },
        { value: 1, label: "Discreta" },
        { value: 2, label: "Acentuada" },
      ],
    },
    {
      key: "xiphoid",
      label: "Retração xifoide",
      options: [
        { value: 0, label: "Ausente" },
        { value: 1, label: "Discreta" },
        { value: 2, label: "Acentuada" },
      ],
    },
    {
      key: "nasal_flaring",
      label: "Batimento de asa de nariz",
      options: [
        { value: 0, label: "Ausente" },
        { value: 1, label: "Discreto" },
        { value: 2, label: "Acentuado" },
      ],
    },
    {
      key: "grunting",
      label: "Gemido expiratório",
      options: [
        { value: 0, label: "Ausente" },
        { value: 1, label: "Audível apenas com estetoscópio" },
        { value: 2, label: "Audível sem estetoscópio" },
      ],
    },
  ],
  bands: [
    {
      min: 0,
      max: 0,
      label: "Sem desconforto respiratório",
      conduct: "Cuidados de rotina.",
    },
    {
      min: 1,
      max: 3,
      label: "Desconforto leve",
      conduct: "Observação e reavaliação seriada.",
    },
    {
      min: 4,
      max: 6,
      label: "Desconforto moderado",
      conduct: "Suporte respiratório e monitorização.",
    },
    {
      min: 7,
      max: 10,
      label: "Desconforto grave",
      conduct: "Suporte ventilatório imediato.",
    },
  ],
  source: "Silverman e Andersen (1956). Conteúdo a revisar com o médico.",
}
