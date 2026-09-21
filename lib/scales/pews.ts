import type { ScaleDefinition } from "./types"

/**
 * PEWS (Brighton) — deterioração clínica da criança internada. Três domínios de
 * 0 a 3 mais os agravantes de 2 pontos; escore de 0 a 11.
 *
 * Os domínios comparam com o normal PARA A IDADE: a régua de frequência
 * cardíaca e respiratória é a da beira do leito, não desta tela.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const PEWS: ScaleDefinition = {
  key: "pews",
  name: "PEWS — alerta precoce de deterioração",
  category: "enfermaria_uti",
  summary:
    "Deterioração clínica da criança internada. Comportamento, cardiovascular e respiratório; escore de 0 a 11.",
  minAgeMonths: 0,
  maxAgeMonths: null,
  items: [
    {
      key: "behaviour",
      label: "Comportamento",
      options: [
        { value: 0, label: "Brincando, comportamento adequado" },
        { value: 1, label: "Dormindo" },
        { value: 2, label: "Irritado" },
        { value: 3, label: "Letárgico, confuso ou com resposta reduzida à dor" },
      ],
    },
    {
      key: "cardiovascular",
      label: "Cardiovascular",
      options: [
        { value: 0, label: "Corado ou enchimento capilar de 1 a 2 s" },
        { value: 1, label: "Pálido ou enchimento capilar de 3 s" },
        {
          value: 2,
          label:
            "Acinzentado, enchimento capilar de 4 s ou taquicardia 20 bpm acima do normal",
        },
        {
          value: 3,
          label:
            "Acinzentado e moteado, enchimento capilar 5 s ou mais, taquicardia 30 bpm acima do normal ou bradicardia",
        },
      ],
    },
    {
      key: "respiratory",
      label: "Respiratório",
      options: [
        { value: 0, label: "Dentro do normal para a idade, sem retração" },
        {
          value: 1,
          label:
            "FR 10 acima do normal, uso de musculatura acessória ou FiO₂ 30% / 3 L/min",
        },
        {
          value: 2,
          label: "FR 20 acima do normal, retrações ou FiO₂ 40% / 6 L/min",
        },
        {
          value: 3,
          label:
            "FR 5 abaixo do normal com retração e gemido, ou FiO₂ 50% / 8 L/min",
        },
      ],
    },
    {
      key: "aggravating",
      label: "Agravante",
      options: [
        { value: 0, label: "Nenhum" },
        {
          value: 2,
          label:
            "Nebulização a cada 15 minutos ou vômitos persistentes no pós-operatório",
        },
      ],
    },
  ],
  bands: [
    {
      min: 0,
      max: 2,
      label: "Risco baixo",
      conduct: "Manter a rotina de observação da unidade.",
    },
    {
      min: 3,
      max: 4,
      label: "Risco intermediário",
      conduct: "Reavaliar em até 1 hora e comunicar o médico assistente.",
    },
    {
      min: 5,
      max: 11,
      label: "Risco alto",
      conduct: "Avaliação médica imediata e acionamento do time de resposta rápida.",
    },
  ],
  source: "Brighton PEWS (Monaghan, 2005). Conteúdo a revisar com o médico.",
}
