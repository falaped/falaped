import type { ScaleDefinition } from "./types"

/**
 * STRONGkids — triagem de risco nutricional na criança hospitalizada ou em
 * avaliação ambulatorial. Quatro itens; a doença de alto risco vale 2 pontos e
 * os demais 1, escore de 0 a 5.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const STRONGKIDS: ScaleDefinition = {
  key: "strongkids",
  name: "STRONGkids — risco nutricional",
  category: "puericultura",
  summary:
    "Triagem de risco nutricional em quatro itens, escore de 0 a 5, com conduta por faixa.",
  minAgeMonths: 1,
  maxAgeMonths: null,
  items: [
    {
      key: "clinical",
      label:
        "Avaliação clínica subjetiva: estado nutricional comprometido (perda de gordura subcutânea, perda de massa muscular, face encovada)",
      options: [
        { value: 0, label: "Não" },
        { value: 1, label: "Sim" },
      ],
    },
    {
      key: "high_risk_disease",
      label: "Doença de alto risco nutricional ou cirurgia de grande porte prevista",
      options: [
        { value: 0, label: "Não" },
        { value: 2, label: "Sim" },
      ],
    },
    {
      key: "intake",
      label:
        "Ingestão reduzida, diarreia ou vômitos nos últimos dias, dieta especial em curso ou dor que impeça a alimentação",
      options: [
        { value: 0, label: "Não" },
        { value: 1, label: "Sim" },
      ],
    },
    {
      key: "weight",
      label:
        "Perda de peso ou ausência de ganho de peso nas últimas semanas ou meses",
      options: [
        { value: 0, label: "Não" },
        { value: 1, label: "Sim" },
      ],
    },
  ],
  bands: [
    {
      min: 0,
      max: 0,
      label: "Risco baixo",
      conduct: "Sem intervenção; repetir a triagem conforme a rotina.",
    },
    {
      min: 1,
      max: 3,
      label: "Risco médio",
      conduct:
        "Acompanhar peso e ingestão de perto; considerar avaliação nutricional.",
    },
    {
      min: 4,
      max: 5,
      label: "Risco alto",
      conduct:
        "Avaliação nutricional e conduta dietética; monitorar peso com intervalo curto.",
    },
  ],
  source:
    "STRONGkids (Hulst et al., 2010). Conteúdo a revisar com o médico.",
}
