import { MCHAT_R } from "./mchat-r"
import type { ScaleDefinition } from "./types"

/**
 * M-CHAT-R/F — resultado da entrevista de seguimento, aplicada quando o
 * rastreio (M-CHAT-R) cai na faixa de risco médio (3 a 7).
 *
 * A entrevista em si é conduzida pelo médico com a família, item a item. O que
 * o sistema registra é o DESFECHO de cada item depois da conversa: os itens já
 * entram como "passou", e o médico vira apenas os que continuam alterados. Por
 * isso todo item tem `defaultValue: 0` — sem isso seriam vinte cliques para
 * registrar dois itens.
 *
 * Regra de corte do instrumento: dois ou mais itens ainda alterados após o
 * seguimento = rastreio positivo.
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const MCHAT_RF: ScaleDefinition = {
  key: "mchat-rf",
  name: "M-CHAT-R/F — entrevista de seguimento",
  category: "puericultura",
  summary:
    "Desfecho da entrevista de seguimento dos itens falhados no M-CHAT-R. Dois ou mais itens alterados = rastreio positivo.",
  minAgeMonths: 16,
  maxAgeMonths: 30,
  items: MCHAT_R.items.map((item) => ({
    key: item.key,
    label: item.label,
    defaultValue: 0,
    options: [
      { value: 0, label: "Passou (não falhou no rastreio ou foi esclarecido)" },
      { value: 1, label: "Continua alterado após o seguimento" },
    ],
  })),
  bands: [
    {
      min: 0,
      max: 1,
      label: "Rastreio negativo após o seguimento",
      conduct:
        "Menos de dois itens alterados: sem encaminhamento por este rastreio; manter a vigilância do desenvolvimento.",
    },
    {
      min: 2,
      max: 20,
      label: "Rastreio positivo",
      conduct:
        "Dois ou mais itens alterados: encaminhar para avaliação diagnóstica e intervenção precoce.",
    },
  ],
  source:
    "M-CHAT-R/F (Robins, Fein & Barton, 2009) — desfecho por item; o roteiro da entrevista é conduzido pelo médico. Conteúdo a revisar com o médico.",
}
