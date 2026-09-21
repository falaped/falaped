import type { ScaleDefinition } from "./types"

/**
 * FLACC — avaliação de dor por observação, para criança que não relata a própria
 * dor (pré-verbal ou sem comunicação verbal). Cinco itens de 0 a 2; escore de 0 a 10.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const FLACC: ScaleDefinition = {
  key: "flacc",
  name: "FLACC — dor por observação",
  category: "pronto_atendimento",
  summary:
    "Dor observada em criança que não relata a própria dor. Cinco itens, escore de 0 a 10.",
  minAgeMonths: 0,
  maxAgeMonths: null,
  items: [
    {
      key: "face",
      label: "Face",
      options: [
        { value: 0, label: "Sem expressão particular ou sorrindo" },
        {
          value: 1,
          label: "Careta ou sobrancelha franzida de vez em quando, retraída, desinteressada",
        },
        { value: 2, label: "Tremor frequente do queixo, mandíbula cerrada" },
      ],
    },
    {
      key: "legs",
      label: "Pernas",
      options: [
        { value: 0, label: "Posição normal ou relaxadas" },
        { value: 1, label: "Inquietas, agitadas, tensas" },
        { value: 2, label: "Chutando ou esticadas" },
      ],
    },
    {
      key: "activity",
      label: "Atividade",
      options: [
        { value: 0, label: "Deitada quieta, posição normal, move-se com facilidade" },
        { value: 1, label: "Contorcendo-se, movendo-se para frente e para trás, tensa" },
        { value: 2, label: "Curvada, rígida ou com movimentos bruscos" },
      ],
    },
    {
      key: "cry",
      label: "Choro",
      options: [
        { value: 0, label: "Sem choro (acordada ou dormindo)" },
        { value: 1, label: "Gemidos ou choramingos, queixa ocasional" },
        { value: 2, label: "Choro persistente, grito ou soluço, queixa frequente" },
      ],
    },
    {
      key: "consolability",
      label: "Consolabilidade",
      options: [
        { value: 0, label: "Satisfeita, relaxada" },
        {
          value: 1,
          label: "Tranquilizada por toque, abraço ou conversa; pode ser distraída",
        },
        { value: 2, label: "Difícil de consolar ou confortar" },
      ],
    },
  ],
  bands: [
    { min: 0, max: 0, label: "Sem dor", conduct: "Relaxada e confortável." },
    {
      min: 1,
      max: 3,
      label: "Desconforto leve",
      conduct: "Medidas de conforto; reavaliar.",
    },
    {
      min: 4,
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
  source: "FLACC (Merkel et al., 1997). Conteúdo a revisar com o médico.",
}
