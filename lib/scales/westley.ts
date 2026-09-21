import type { ScaleDefinition } from "./types"

/**
 * Escore de Westley — gravidade da laringotraqueíte (crupe). Escore de 0 a 17;
 * cianose e nível de consciência pesam muito mais que os demais itens, por
 * desenho da escala.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const WESTLEY: ScaleDefinition = {
  key: "westley",
  name: "Westley — gravidade do crupe",
  category: "pronto_atendimento",
  summary:
    "Gravidade da laringotraqueíte (crupe). Cinco itens, escore de 0 a 17.",
  minAgeMonths: 3,
  maxAgeMonths: 72,
  items: [
    {
      key: "stridor",
      label: "Estridor inspiratório",
      options: [
        { value: 0, label: "Ausente" },
        { value: 1, label: "Ao agitar-se ou chorar" },
        { value: 2, label: "Em repouso" },
      ],
    },
    {
      key: "retraction",
      label: "Retração (tiragem)",
      options: [
        { value: 0, label: "Ausente" },
        { value: 1, label: "Leve" },
        { value: 2, label: "Moderada" },
        { value: 3, label: "Grave" },
      ],
    },
    {
      key: "air_entry",
      label: "Entrada de ar",
      options: [
        { value: 0, label: "Normal" },
        { value: 1, label: "Diminuída" },
        { value: 2, label: "Muito diminuída" },
      ],
    },
    {
      key: "cyanosis",
      label: "Cianose",
      options: [
        { value: 0, label: "Ausente" },
        { value: 4, label: "Ao agitar-se" },
        { value: 5, label: "Em repouso" },
      ],
    },
    {
      key: "consciousness",
      label: "Nível de consciência",
      options: [
        { value: 0, label: "Normal, inclusive dormindo" },
        { value: 5, label: "Desorientado ou rebaixado" },
      ],
    },
  ],
  bands: [
    {
      min: 0,
      max: 2,
      label: "Crupe leve",
      conduct: "Corticoide em dose única; orientação e alta com reavaliação.",
    },
    {
      min: 3,
      max: 5,
      label: "Crupe moderado",
      conduct: "Corticoide e observação; considerar adrenalina inalatória.",
    },
    {
      min: 6,
      max: 11,
      label: "Crupe grave",
      conduct: "Adrenalina inalatória, corticoide e observação prolongada.",
    },
    {
      min: 12,
      max: 17,
      label: "Insuficiência respiratória iminente",
      conduct: "Suporte avançado de via aérea e vaga em terapia intensiva.",
    },
  ],
  source: "Westley et al. (1978). Conteúdo a revisar com o médico.",
}
