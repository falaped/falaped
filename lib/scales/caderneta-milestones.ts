import type { ScaleDefinition } from "./types"

/**
 * Marcos do desenvolvimento da Caderneta da Criança (Ministério da Saúde), uma
 * escala POR FAIXA ETÁRIA. As faixas cobrem 0 a 59 meses sem buraco, então
 * `getScalesForAgeMonths` oferece exatamente a faixa da criança e nenhuma outra.
 *
 * Não é escore de gravidade: cada marco vale 0 (presente) ou 1 (ausente), e a
 * soma é a CONTAGEM de marcos ausentes. Um marco ausente já é alerta.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */

const MILESTONE_SOURCE =
  "Caderneta da Criança — instrumento de vigilância do desenvolvimento (Ministério da Saúde). Conteúdo a revisar com o médico."

/** Monta a definição de uma faixa a partir da lista de marcos esperados. */
function milestoneScale(
  key: string,
  label: string,
  minAgeMonths: number,
  maxAgeMonths: number,
  milestones: readonly string[],
): ScaleDefinition {
  return {
    key: `marcos-${key}`,
    name: `Marcos do desenvolvimento — ${label}`,
    category: "puericultura",
    summary: `Marcos esperados da Caderneta da Criança para ${label}. Marque cada marco como presente ou ausente.`,
    minAgeMonths,
    maxAgeMonths,
    items: milestones.map((milestone, index) => ({
      key: `m${index + 1}`,
      label: milestone,
      options: [
        { value: 0, label: "Presente" },
        { value: 1, label: "Ausente" },
      ],
    })),
    bands: [
      {
        min: 0,
        max: 0,
        label: "Desenvolvimento adequado",
        conduct:
          "Todos os marcos da faixa presentes. Elogiar a família e orientar a estimulação da próxima faixa.",
      },
      {
        min: 1,
        max: 1,
        label: "Alerta — um marco ausente",
        conduct:
          "Orientar estimulação e reavaliar em 30 dias. Persistindo, encaminhar para avaliação.",
      },
      {
        min: 2,
        max: milestones.length,
        label: "Provável atraso — dois ou mais marcos ausentes",
        conduct:
          "Investigar e encaminhar para avaliação do desenvolvimento; verificar audição e visão.",
      },
    ],
    source: MILESTONE_SOURCE,
  }
}

/**
 * Faixas da Caderneta, contíguas em meses inteiros de 0 a 59. Mexer nos limites
 * exige manter a contiguidade — o teste de faixas cobre isso.
 */
export const CADERNETA_MILESTONE_SCALES: readonly ScaleDefinition[] = [
  milestoneScale("0-1m", "até 1 mês", 0, 0, [
    "Postura: barriga para cima, braços e pernas fletidos, cabeça lateralizada",
    "Observa o rosto do examinador",
    "Reage ao som",
    "Eleva a cabeça quando de bruços",
  ]),
  milestoneScale("1-2m", "1 a 2 meses", 1, 1, [
    "Sorri quando estimulada",
    "Abre as mãos",
    "Emite sons (gugu, aaa)",
    "Movimenta ativamente os membros",
  ]),
  milestoneScale("2-4m", "2 a 4 meses", 2, 3, [
    "Responde ao examinador com sorriso social",
    "Segura objetos colocados na mão",
    "Emite sons como se conversasse",
    "De bruços, levanta a cabeça apoiada nos antebraços",
  ]),
  milestoneScale("4-6m", "4 a 6 meses", 4, 5, [
    "Busca ativamente objetos",
    "Leva objetos à boca",
    "Localiza o som",
    "Muda de posição (rola)",
  ]),
  milestoneScale("6-9m", "6 a 9 meses", 6, 8, [
    "Brinca de esconde-achou",
    "Transfere objetos de uma mão para a outra",
    "Duplica sílabas (dada, papa)",
    "Senta sem apoio",
  ]),
  milestoneScale("9-12m", "9 a 12 meses", 9, 11, [
    "Imita gestos (bate palmas, dá tchau)",
    "Faz pinça com polegar e indicador",
    "Produz jargão (fala própria com entonação)",
    "Anda com apoio",
  ]),
  milestoneScale("12-15m", "12 a 15 meses", 12, 14, [
    "Mostra o que quer sem chorar",
    "Coloca blocos na caneca",
    "Diz uma palavra com significado",
    "Anda sem apoio",
  ]),
  milestoneScale("15-18m", "15 a 18 meses", 15, 17, [
    "Usa colher ou garfo",
    "Constrói torre de dois cubos",
    "Fala três palavras",
    "Anda para trás",
  ]),
  milestoneScale("18-24m", "18 a 24 meses", 18, 23, [
    "Tira a roupa",
    "Constrói torre de três cubos",
    "Aponta duas figuras",
    "Chuta bola",
  ]),
  milestoneScale("2-3a", "2 a 3 anos", 24, 35, [
    "Veste-se com supervisão",
    "Constrói torre de seis cubos",
    "Forma frases com duas palavras",
    "Pula com ambos os pés",
  ]),
  milestoneScale("3-4a", "3 a 4 anos", 36, 47, [
    "Brinca com outras crianças",
    "Copia um círculo",
    "Fala de forma compreensível para estranhos",
    "Equilibra-se em cada pé por um segundo",
  ]),
  milestoneScale("4-5a", "4 a 5 anos", 48, 59, [
    "Veste-se sem ajuda",
    "Copia uma cruz",
    "Reconhece cores",
    "Equilibra-se em cada pé por três segundos",
  ]),
]
