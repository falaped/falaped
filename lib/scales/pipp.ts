import type { ScaleDefinition, ScaleItem } from "./types"

/** Os três itens faciais usam a mesma régua de tempo da observação. */
function facialItem(key: string, label: string): ScaleItem {
  return {
    key,
    label,
    options: [
      { value: 0, label: "Nenhum (até 9% do tempo)" },
      { value: 1, label: "Mínimo (10% a 39% do tempo)" },
      { value: 2, label: "Moderado (40% a 69% do tempo)" },
      { value: 3, label: "Máximo (70% do tempo ou mais)" },
    ],
  }
}

/**
 * PIPP — dor no prematuro. Sete itens de 0 a 3; escore de 0 a 21.
 *
 * A idade gestacional e o estado comportamental entram como itens: o prematuro
 * extremo e o bebê dormindo pontuam mais porque expressam menos dor.
 *
 * Faixa etária até 6 meses, e não até 2 como o NIPS: o prematuro internado
 * passa dos 2 meses de idade cronológica ainda na UTI neonatal.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const PIPP: ScaleDefinition = {
  key: "pipp",
  name: "PIPP — dor no prematuro",
  category: "neonatologia",
  summary:
    "Dor do prematuro e do recém-nascido em procedimento. Sete itens, escore de 0 a 21.",
  minAgeMonths: 0,
  maxAgeMonths: 6,
  items: [
    {
      key: "gestational_age",
      label: "Idade gestacional",
      options: [
        { value: 0, label: "36 semanas ou mais" },
        { value: 1, label: "32 a 35 semanas e 6 dias" },
        { value: 2, label: "28 a 31 semanas e 6 dias" },
        { value: 3, label: "Menos de 28 semanas" },
      ],
    },
    {
      key: "behavioral_state",
      label: "Estado comportamental (15 s antes do procedimento)",
      options: [
        { value: 0, label: "Ativo, acordado, olhos abertos, com movimentos faciais" },
        { value: 1, label: "Quieto, acordado, olhos abertos, sem movimentos faciais" },
        { value: 2, label: "Ativo, dormindo, olhos fechados, com movimentos faciais" },
        { value: 3, label: "Quieto, dormindo, olhos fechados, sem movimentos faciais" },
      ],
    },
    {
      key: "heart_rate",
      label: "Aumento da frequência cardíaca",
      options: [
        { value: 0, label: "0 a 4 bpm" },
        { value: 1, label: "5 a 14 bpm" },
        { value: 2, label: "15 a 24 bpm" },
        { value: 3, label: "25 bpm ou mais" },
      ],
    },
    {
      key: "oxygen_saturation",
      label: "Queda da saturação de oxigênio",
      options: [
        { value: 0, label: "0% a 2,4%" },
        { value: 1, label: "2,5% a 4,9%" },
        { value: 2, label: "5% a 7,4%" },
        { value: 3, label: "7,5% ou mais" },
      ],
    },
    facialItem("brow_bulge", "Testa franzida"),
    facialItem("eye_squeeze", "Olhos espremidos"),
    facialItem("nasolabial_furrow", "Sulco nasolabial"),
  ],
  bands: [
    {
      min: 0,
      max: 6,
      label: "Sem dor ou dor mínima",
      conduct: "Medidas de conforto; reavaliar.",
    },
    {
      min: 7,
      max: 12,
      label: "Dor leve a moderada",
      conduct: "Medidas não farmacológicas e considerar analgesia.",
    },
    {
      min: 13,
      max: 21,
      label: "Dor moderada a intensa",
      conduct: "Analgesia e reavaliação após a intervenção.",
    },
  ],
  source: "PIPP (Stevens et al., 1996). Conteúdo a revisar com o médico.",
}
