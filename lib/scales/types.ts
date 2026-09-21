/**
 * Tipos da definição declarativa de uma escala pediátrica.
 *
 * Uma escala é DADO, não tela: `lib/scales/<key>.ts` descreve itens, opções e
 * faixas, e um único componente renderiza qualquer uma delas. Escala nova = um
 * arquivo novo no registro de `lib/scales/index.ts`, sem UI nova.
 *
 * A pontuação é sempre a SOMA dos valores escolhidos — escala de item único
 * (Wong-Baker) é o caso degenerado da soma, então não existe segunda regra.
 */

/** Categoria de uso, usada para agrupar o seletor de escalas. */
export type ScaleCategory =
  | "pronto_atendimento"
  | "puericultura"
  | "enfermaria_uti"
  | "neonatologia"

/** Uma opção de resposta de um item, com o valor que entra na soma. */
export type ScaleOption = {
  value: number
  label: string
}

/** Um item (pergunta) da escala. */
export type ScaleItem = {
  key: string
  label: string
  options: readonly ScaleOption[]
}

/**
 * Faixa de interpretação, por escore, com limites INCLUSIVOS. As faixas de uma
 * escala precisam cobrir toda a soma possível sem buraco nem sobreposição —
 * `assertScaleBandsCoverScoreRange` verifica isso nos testes.
 */
export type ScaleBand = {
  min: number
  max: number
  label: string
  /** Conduta sugerida, em PT-BR. Exibida junto do resultado. */
  conduct?: string
}

export type ScaleDefinition = {
  key: string
  name: string
  category: ScaleCategory
  /** Uma linha sobre o que a escala mede, exibida no seletor. */
  summary: string
  /** Idade mínima/máxima de uso em meses; null = sem limite daquele lado. */
  minAgeMonths: number | null
  maxAgeMonths: number | null
  items: readonly ScaleItem[]
  bands: readonly ScaleBand[]
  /** Procedência do conteúdo clínico (quem validou, qual publicação). */
  source: string
}

/** Resultado do cálculo de uma aplicação. */
export type ScaleScore = {
  score: number
  band: ScaleBand
}
