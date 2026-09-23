import type { ScaleDefinition, ScaleItem } from "./types"

/**
 * COMFORT-B — sedação e conforto na UTI pediátrica. Seis itens de 1 a 5;
 * escore de 6 a 30.
 *
 * Um dos seis itens muda conforme a criança: "resposta respiratória" se está em
 * ventilação mecânica, "choro" se respira sozinha. Como no Tal, são duas
 * escalas com os outros cinco itens em comum, e o médico escolhe a certa.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
const ALERTNESS: ScaleItem = {
  key: "alertness",
  label: "Alerta",
  options: [
    { value: 1, label: "Sono profundo" },
    { value: 2, label: "Sono leve" },
    { value: 3, label: "Sonolento" },
    { value: 4, label: "Acordado e alerta" },
    { value: 5, label: "Hiperalerta" },
  ],
}

const CALMNESS: ScaleItem = {
  key: "calmness",
  label: "Calma ou agitação",
  options: [
    { value: 1, label: "Calmo" },
    { value: 2, label: "Levemente ansioso" },
    { value: 3, label: "Ansioso" },
    { value: 4, label: "Muito ansioso" },
    { value: 5, label: "Em pânico" },
  ],
}

const OTHER_ITEMS: readonly ScaleItem[] = [
  {
    key: "movement",
    label: "Movimentação",
    options: [
      { value: 1, label: "Nenhum movimento" },
      { value: 2, label: "Movimentos leves ocasionais" },
      { value: 3, label: "Movimentos leves frequentes" },
      { value: 4, label: "Movimentos vigorosos só das extremidades" },
      { value: 5, label: "Movimentos vigorosos incluindo tronco e cabeça" },
    ],
  },
  {
    key: "muscle_tone",
    label: "Tônus muscular",
    options: [
      { value: 1, label: "Totalmente relaxado" },
      { value: 2, label: "Tônus reduzido" },
      { value: 3, label: "Tônus normal" },
      { value: 4, label: "Tônus aumentado, com flexão de dedos das mãos e dos pés" },
      { value: 5, label: "Rigidez extrema, com flexão de dedos das mãos e dos pés" },
    ],
  },
  {
    key: "facial_tension",
    label: "Tensão facial",
    options: [
      { value: 1, label: "Músculos faciais totalmente relaxados" },
      { value: 2, label: "Tônus facial normal, sem tensão" },
      { value: 3, label: "Tensão evidente em alguns músculos faciais" },
      { value: 4, label: "Tensão evidente em toda a face" },
      { value: 5, label: "Face contorcida, com careta" },
    ],
  },
]

function comfortB(
  key: string,
  nameSuffix: string,
  variableItem: ScaleItem,
): ScaleDefinition {
  return {
    key,
    name: `COMFORT-B — ${nameSuffix}`,
    category: "enfermaria_uti",
    summary: `Sedação e conforto na UTI, ${nameSuffix}. Seis itens, escore de 6 a 30.`,
    minAgeMonths: 0,
    maxAgeMonths: null,
    items: [ALERTNESS, CALMNESS, variableItem, ...OTHER_ITEMS],
    bands: [
      {
        min: 6,
        max: 10,
        label: "Sedação excessiva",
        conduct: "Avaliar redução da sedação.",
      },
      {
        min: 11,
        max: 22,
        label: "Sedação adequada",
        conduct: "Manter e reavaliar.",
      },
      {
        min: 23,
        max: 30,
        label: "Sedação insuficiente ou desconforto",
        conduct: "Investigar dor e desconforto; ajustar analgesia e sedação.",
      },
    ],
    source: "COMFORT Behavior Scale (Ista et al., 2005). Conteúdo a revisar com o médico.",
  }
}

export const COMFORT_B_VENTILATED = comfortB(
  "comfort-b-ventilado",
  "em ventilação mecânica",
  {
    key: "respiratory_response",
    label: "Resposta respiratória",
    options: [
      { value: 1, label: "Sem tosse e sem respiração espontânea" },
      { value: 2, label: "Respiração espontânea, pouca ou nenhuma resposta à ventilação" },
      { value: 3, label: "Tosse ou resistência ao ventilador ocasional" },
      { value: 4, label: "Respira ativamente contra o ventilador ou tosse com frequência" },
      { value: 5, label: "Briga com o ventilador, tosse ou engasga" },
    ],
  },
)

export const COMFORT_B_SPONTANEOUS = comfortB(
  "comfort-b-espontaneo",
  "em respiração espontânea",
  {
    key: "crying",
    label: "Choro",
    options: [
      { value: 1, label: "Respiração tranquila, sem choro" },
      { value: 2, label: "Soluços ou suspiros" },
      { value: 3, label: "Gemência" },
      { value: 4, label: "Choro" },
      { value: 5, label: "Gritos" },
    ],
  },
)

export const COMFORT_B_SCALES: readonly ScaleDefinition[] = [
  COMFORT_B_VENTILATED,
  COMFORT_B_SPONTANEOUS,
]
