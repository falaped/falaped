import type { ScaleDefinition } from "./types"

/**
 * McIsaac (Centor modificado) — probabilidade de faringite estreptocócica e
 * indicação de teste rápido/antibiótico. O item de idade PONTUA NEGATIVO a
 * partir dos 45 anos, então o escore vai de -1 a 5 — as faixas cobrem os
 * negativos, e o teste de cobertura prova isso.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const MCISAAC: ScaleDefinition = {
  key: "mcisaac",
  name: "McIsaac (Centor modificado) — dor de garganta",
  category: "pronto_atendimento",
  summary:
    "Probabilidade de faringite estreptocócica e indicação de teste rápido. Cinco itens, escore de -1 a 5.",
  minAgeMonths: 36,
  maxAgeMonths: null,
  items: [
    {
      key: "fever",
      label: "Temperatura acima de 38 °C (aferida ou referida)",
      options: [
        { value: 0, label: "Não" },
        { value: 1, label: "Sim" },
      ],
    },
    {
      key: "no_cough",
      label: "Ausência de tosse",
      options: [
        { value: 0, label: "Tem tosse" },
        { value: 1, label: "Sem tosse" },
      ],
    },
    {
      key: "nodes",
      label: "Linfonodos cervicais anteriores aumentados e dolorosos",
      options: [
        { value: 0, label: "Não" },
        { value: 1, label: "Sim" },
      ],
    },
    {
      key: "tonsils",
      label: "Edema ou exsudato amigdaliano",
      options: [
        { value: 0, label: "Não" },
        { value: 1, label: "Sim" },
      ],
    },
    {
      key: "age",
      label: "Idade",
      options: [
        { value: 1, label: "3 a 14 anos" },
        { value: 0, label: "15 a 44 anos" },
        { value: -1, label: "45 anos ou mais" },
      ],
    },
  ],
  bands: [
    {
      min: -1,
      max: 1,
      label: "Risco baixo",
      conduct:
        "Estreptococo pouco provável: sem teste e sem antibiótico; tratamento sintomático.",
    },
    {
      min: 2,
      max: 3,
      label: "Risco intermediário",
      conduct:
        "Solicitar teste rápido ou cultura; antibiótico apenas se o resultado for positivo.",
    },
    {
      min: 4,
      max: 5,
      label: "Risco alto",
      conduct:
        "Testar e tratar conforme o resultado; considerar antibiótico empírico segundo o quadro clínico.",
    },
  ],
  source:
    "McIsaac et al. (1998), escore de Centor modificado. Conteúdo a revisar com o médico.",
}
