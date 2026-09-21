import type { ScaleDefinition } from "./types"

/**
 * NIPS — dor no recém-nascido por observação. Seis itens; escore de 0 a 7.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const NIPS: ScaleDefinition = {
  key: "nips",
  name: "NIPS — dor no recém-nascido",
  category: "neonatologia",
  summary: "Dor do recém-nascido por observação. Seis itens, escore de 0 a 7.",
  minAgeMonths: 0,
  maxAgeMonths: 2,
  items: [
    {
      key: "face",
      label: "Expressão facial",
      options: [
        { value: 0, label: "Relaxada" },
        { value: 1, label: "Careta" },
      ],
    },
    {
      key: "cry",
      label: "Choro",
      options: [
        { value: 0, label: "Ausente" },
        { value: 1, label: "Resmungo" },
        { value: 2, label: "Vigoroso" },
      ],
    },
    {
      key: "breathing",
      label: "Padrão respiratório",
      options: [
        { value: 0, label: "Relaxado" },
        { value: 1, label: "Alterado" },
      ],
    },
    {
      key: "arms",
      label: "Braços",
      options: [
        { value: 0, label: "Relaxados" },
        { value: 1, label: "Fletidos ou estendidos" },
      ],
    },
    {
      key: "legs",
      label: "Pernas",
      options: [
        { value: 0, label: "Relaxadas" },
        { value: 1, label: "Fletidas ou estendidas" },
      ],
    },
    {
      key: "alertness",
      label: "Estado de alerta",
      options: [
        { value: 0, label: "Dormindo ou calmo" },
        { value: 1, label: "Desconfortável" },
      ],
    },
  ],
  bands: [
    {
      min: 0,
      max: 3,
      label: "Sem dor ou dor leve",
      conduct: "Medidas de conforto; reavaliar.",
    },
    {
      min: 4,
      max: 7,
      label: "Dor",
      conduct: "Analgesia e reavaliação após a intervenção.",
    },
  ],
  source: "NIPS (Lawrence et al., 1993). Conteúdo a revisar com o médico.",
}
