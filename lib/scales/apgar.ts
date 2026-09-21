import type { ScaleDefinition } from "./types"

/**
 * Apgar — vitalidade do recém-nascido no 1º e no 5º minuto. Cinco itens de 0 a 2;
 * escore de 0 a 10. Cada minuto avaliado é uma aplicação separada.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const APGAR: ScaleDefinition = {
  key: "apgar",
  name: "Apgar — vitalidade ao nascer",
  category: "neonatologia",
  summary:
    "Vitalidade do recém-nascido. Cinco itens, escore de 0 a 10; aplicar no 1º e no 5º minuto.",
  minAgeMonths: 0,
  maxAgeMonths: 0,
  items: [
    {
      key: "heart_rate",
      label: "Frequência cardíaca",
      options: [
        { value: 0, label: "Ausente" },
        { value: 1, label: "Menor que 100 bpm" },
        { value: 2, label: "100 bpm ou mais" },
      ],
    },
    {
      key: "respiration",
      label: "Esforço respiratório",
      options: [
        { value: 0, label: "Ausente" },
        { value: 1, label: "Fraco, irregular ou choro débil" },
        { value: 2, label: "Choro forte, respiração regular" },
      ],
    },
    {
      key: "muscle_tone",
      label: "Tônus muscular",
      options: [
        { value: 0, label: "Flácido" },
        { value: 1, label: "Alguma flexão de extremidades" },
        { value: 2, label: "Movimento ativo, boa flexão" },
      ],
    },
    {
      key: "reflex",
      label: "Irritabilidade reflexa",
      options: [
        { value: 0, label: "Sem resposta ao estímulo" },
        { value: 1, label: "Careta" },
        { value: 2, label: "Tosse, espirro ou choro vigoroso" },
      ],
    },
    {
      key: "color",
      label: "Cor",
      options: [
        { value: 0, label: "Cianótico ou pálido" },
        { value: 1, label: "Corpo rosado, extremidades cianóticas" },
        { value: 2, label: "Totalmente rosado" },
      ],
    },
  ],
  bands: [
    {
      min: 0,
      max: 3,
      label: "Vitalidade gravemente comprometida",
      conduct: "Reanimação neonatal imediata.",
    },
    {
      min: 4,
      max: 6,
      label: "Vitalidade moderadamente comprometida",
      conduct: "Suporte e reavaliação no minuto seguinte.",
    },
    {
      min: 7,
      max: 10,
      label: "Boa vitalidade",
      conduct: "Cuidados de rotina com o recém-nascido.",
    },
  ],
  source: "Apgar (1953). Conteúdo a revisar com o médico.",
}
