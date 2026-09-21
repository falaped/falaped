import type { ScaleDefinition } from "./types"

/**
 * M-CHAT-R — rastreio de risco de TEA, respondido pelo responsável, de 16 a 30
 * meses. Vinte itens sim/não; pontua 1 a resposta de RISCO, que na maioria dos
 * itens é "Não" e nos itens 2, 5 e 12 é "Sim" (marcados abaixo como INVERTIDO).
 * A inversão mora nos valores das opções — o motor só soma, não conhece regra
 * de item.
 *
 * Esta é a parte R. A entrevista de seguimento (o /F) NÃO está implementada: na
 * faixa média o resultado orienta aplicá-la. Ver #44.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */

/** Item comum: risco = "Não". */
function item(key: string, label: string) {
  return {
    key,
    label,
    options: [
      { value: 0, label: "Sim" },
      { value: 1, label: "Não" },
    ],
  }
}

/** Item INVERTIDO (2, 5 e 12): risco = "Sim". */
function invertedItem(key: string, label: string) {
  return {
    key,
    label,
    options: [
      { value: 1, label: "Sim" },
      { value: 0, label: "Não" },
    ],
  }
}

export const MCHAT_R: ScaleDefinition = {
  key: "mchat-r",
  name: "M-CHAT-R — rastreio de TEA",
  category: "puericultura",
  summary:
    "Rastreio de risco de autismo respondido pelo responsável, de 16 a 30 meses. Vinte itens, escore de 0 a 20.",
  minAgeMonths: 16,
  maxAgeMonths: 30,
  items: [
    item(
      "q1",
      "1. Se você aponta para algo do outro lado do cômodo, seu filho olha para o objeto?",
    ),
    invertedItem("q2", "2. Você já suspeitou que seu filho fosse surdo?"),
    item("q3", "3. Seu filho brinca de faz de conta?"),
    item("q4", "4. Seu filho gosta de subir em coisas?"),
    invertedItem(
      "q5",
      "5. Seu filho faz movimentos estranhos com os dedos perto dos olhos?",
    ),
    item(
      "q6",
      "6. Seu filho aponta com um dedo para pedir alguma coisa ou pedir ajuda?",
    ),
    item(
      "q7",
      "7. Seu filho aponta com um dedo para mostrar algo interessante?",
    ),
    item("q8", "8. Seu filho se interessa por outras crianças?"),
    item(
      "q9",
      "9. Seu filho mostra coisas a você, trazendo ou levantando o objeto, só para compartilhar e não para pedir ajuda?",
    ),
    item("q10", "10. Seu filho responde quando você o chama pelo nome?"),
    item("q11", "11. Quando você sorri para seu filho, ele sorri de volta?"),
    invertedItem(
      "q12",
      "12. Seu filho fica incomodado com barulhos do dia a dia?",
    ),
    item("q13", "13. Seu filho anda?"),
    item(
      "q14",
      "14. Seu filho olha nos seus olhos quando você fala com ele, brinca ou o veste?",
    ),
    item("q15", "15. Seu filho tenta imitar o que você faz?"),
    item(
      "q16",
      "16. Se você vira a cabeça para olhar alguma coisa, seu filho olha em volta para ver o que você está olhando?",
    ),
    item("q17", "17. Seu filho tenta fazer você olhar para ele?"),
    item("q18", "18. Seu filho entende quando você manda ele fazer alguma coisa?"),
    item(
      "q19",
      "19. Se acontece algo novo, seu filho olha para o seu rosto para ver como você se sente a respeito?",
    ),
    item("q20", "20. Seu filho gosta de atividades com movimento?"),
  ],
  bands: [
    {
      min: 0,
      max: 2,
      label: "Risco baixo",
      conduct: "Sem necessidade de ação adicional; repetir o rastreio na rotina.",
    },
    {
      min: 3,
      max: 7,
      label: "Risco médio",
      conduct:
        "Aplicar a entrevista de seguimento (M-CHAT-R/F) sobre os itens falhados antes de encaminhar.",
    },
    {
      min: 8,
      max: 20,
      label: "Risco alto",
      conduct:
        "Dispensa a entrevista de seguimento: encaminhar para avaliação diagnóstica e intervenção precoce.",
    },
  ],
  source:
    "M-CHAT-R (Robins, Fein & Barton, 2009). Conteúdo a revisar com o médico.",
}
