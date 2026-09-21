import type { ScaleDefinition } from "./types"

/**
 * Escala de coma de Glasgow pediátrica — versão com a resposta verbal adaptada à
 * criança pré-verbal. Escore de 3 a 15. Acima dos 5 anos usa-se a ECG padrão,
 * por isso a escala não é oferecida nessa idade.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const GLASGOW_PEDIATRICA: ScaleDefinition = {
  key: "glasgow-pediatrica",
  name: "Glasgow pediátrica — nível de consciência",
  category: "pronto_atendimento",
  summary:
    "Nível de consciência na criança pré-verbal. Abertura ocular, resposta verbal e motora; escore de 3 a 15.",
  minAgeMonths: 0,
  maxAgeMonths: 59,
  items: [
    {
      key: "eye",
      label: "Abertura ocular",
      options: [
        { value: 1, label: "Nenhuma" },
        { value: 2, label: "À dor" },
        { value: 3, label: "Ao som ou ao chamado" },
        { value: 4, label: "Espontânea" },
      ],
    },
    {
      key: "verbal",
      label: "Melhor resposta verbal",
      options: [
        { value: 1, label: "Nenhuma" },
        { value: 2, label: "Gemidos à dor" },
        { value: 3, label: "Choro à dor" },
        { value: 4, label: "Choro irritado, consolável" },
        { value: 5, label: "Balbucia, sorri, orienta ao som, interage" },
      ],
    },
    {
      key: "motor",
      label: "Melhor resposta motora",
      options: [
        { value: 1, label: "Nenhuma" },
        { value: 2, label: "Extensão à dor (descerebração)" },
        { value: 3, label: "Flexão anormal à dor (decorticação)" },
        { value: 4, label: "Retirada à dor" },
        { value: 5, label: "Retirada ao toque, localiza a dor" },
        { value: 6, label: "Movimentos espontâneos e propositais" },
      ],
    },
  ],
  bands: [
    {
      min: 3,
      max: 8,
      label: "Rebaixamento grave",
      conduct: "Via aérea em risco: considerar intubação e via de suporte avançado.",
    },
    {
      min: 9,
      max: 12,
      label: "Rebaixamento moderado",
      conduct: "Monitorização contínua e reavaliação frequente.",
    },
    {
      min: 13,
      max: 15,
      label: "Rebaixamento leve ou ausente",
      conduct: "Observação clínica; reavaliar se houver piora.",
    },
  ],
  source:
    "ECG pediátrica (adaptação pré-verbal de Teasdale e Jennett). Conteúdo a revisar com o médico.",
}
