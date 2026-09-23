import type { ScaleDefinition, ScaleItem } from "./types"

/**
 * Os quatro primeiros itens são de comportamento ESPERADO: pontua quando falta
 * ("nunca" vale 4). Os quatro últimos são de comportamento alterado: pontua
 * quando aparece ("sempre" vale 4). A inversão está nas opções, como no M-CHAT-R.
 */
const FREQUENCIES = ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]

function capdItem(key: string, label: string, reversed: boolean): ScaleItem {
  return {
    key,
    label,
    options: FREQUENCIES.map((frequency, index) => ({
      value: reversed ? 4 - index : index,
      label: frequency,
    })),
  }
}

/**
 * CAPD — rastreio de delirium na UTI pediátrica. Oito itens de 0 a 4; escore de
 * 0 a 32, positivo a partir de 9.
 *
 * Só se aplica com RASS de -3 ou mais: abaixo disso a criança não responde o
 * bastante para ser avaliada.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const CAPD: ScaleDefinition = {
  key: "capd",
  name: "CAPD — delirium",
  category: "enfermaria_uti",
  summary:
    "Rastreio de delirium na UTI, com RASS de -3 ou mais. Oito itens, positivo a partir de 9.",
  minAgeMonths: 0,
  maxAgeMonths: null,
  items: [
    capdItem("eye_contact", "Faz contato visual com o cuidador?", true),
    capdItem("purposeful", "Suas ações têm propósito?", true),
    capdItem("aware", "Está atento ao ambiente?", true),
    capdItem("communicates", "Comunica necessidades e vontades?", true),
    capdItem("restless", "Está inquieto?", false),
    capdItem("inconsolable", "Está inconsolável?", false),
    capdItem("underactive", "Está hipoativo — se mexe muito pouco acordado?", false),
    capdItem("slow_response", "Demora para responder às interações?", false),
  ],
  bands: [
    {
      min: 0,
      max: 8,
      label: "Rastreio negativo",
      conduct: "Reaplicar a cada turno.",
    },
    {
      min: 9,
      max: 32,
      label: "Rastreio positivo para delirium",
      conduct: "Investigar causas, rever sedativos e medidas de higiene do sono.",
    },
  ],
  source: "Cornell Assessment of Pediatric Delirium (Traube et al., 2014). Conteúdo a revisar com o médico.",
}
