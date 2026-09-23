import type { ScaleDefinition } from "./types"

/**
 * RASS — agitação e sedação. Item único de -5 a +4; o zero é o alvo (alerta e
 * calmo). O escore negativo é esperado, como no McIsaac.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const RASS: ScaleDefinition = {
  key: "rass",
  name: "RASS — agitação e sedação",
  category: "enfermaria_uti",
  summary: "Nível de agitação ou sedação. Item único, de -5 a +4.",
  minAgeMonths: 0,
  maxAgeMonths: null,
  items: [
    {
      key: "level",
      label: "Nível observado",
      options: [
        { value: 4, label: "+4 — Combativo, violento, perigo para a equipe" },
        { value: 3, label: "+3 — Muito agitado, puxa ou retira tubos e cateteres" },
        { value: 2, label: "+2 — Agitado, movimentos sem propósito, briga com o ventilador" },
        { value: 1, label: "+1 — Inquieto, ansioso, movimentos não agressivos" },
        { value: 0, label: "0 — Alerta e calmo" },
        { value: -1, label: "-1 — Sonolento, desperta à voz por mais de 10 s" },
        { value: -2, label: "-2 — Sedação leve, desperta à voz por menos de 10 s" },
        { value: -3, label: "-3 — Sedação moderada, movimento à voz sem contato visual" },
        { value: -4, label: "-4 — Sedação profunda, sem resposta à voz, movimento ao toque" },
        { value: -5, label: "-5 — Não despertável, sem resposta à voz nem ao toque" },
      ],
    },
  ],
  bands: [
    {
      min: -5,
      max: -4,
      label: "Sedação profunda",
      conduct: "Avaliar redução da sedação. Não aplicar o CAPD neste nível.",
    },
    {
      min: -3,
      max: -1,
      label: "Sedação leve a moderada",
      conduct: "Conferir com o alvo de sedação prescrito.",
    },
    { min: 0, max: 0, label: "Alerta e calmo" },
    {
      min: 1,
      max: 4,
      label: "Agitação",
      conduct: "Investigar dor, delirium e desconforto; garantir a segurança de tubos e cateteres.",
    },
  ],
  source: "Richmond Agitation-Sedation Scale (Sessler et al., 2002). Conteúdo a revisar com o médico.",
}
